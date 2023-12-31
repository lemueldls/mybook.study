import io
import sys
from functools import partial
from pathlib import Path

import pypdfium2
import torch
import openai
from firebase_admin import db, initialize_app, os, storage, auth
from firebase_functions import https_fn, options
from nougat import NougatModel
from nougat.dataset.rasterize import rasterize_paper
from nougat.postprocessing import markdown_compatible
from nougat.utils.checkpoint import get_checkpoint
from nougat.utils.dataset import ImageDataset
from nougat.utils.device import default_batch_size, move_to_device
from PIL import Image
from tqdm import tqdm
import requests
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv()

ID = os.getenv("WOLFRAM_ID")
openai.api_key = os.getenv("OPENAI_API_KEY")

dirname = os.path.dirname(__file__)
checkpoint = os.path.join(dirname, "checkpoint")
NOUGAT_CHECKPOINT = get_checkpoint(checkpoint_path=checkpoint, model_tag="0.1.0-small")
if NOUGAT_CHECKPOINT is None:
    sys.exit(1)

NOUGAT_BATCHSIZE = int(os.environ.get("NOUGAT_BATCHSIZE", default_batch_size()))

model = NougatModel.from_pretrained(NOUGAT_CHECKPOINT)
model = move_to_device(model, bf16=False)
model.eval()


app = initialize_app()
bucket = storage.bucket()


def req_user(req):
    token = req.headers.get("Authorization", "").split(" ")[-1]

    return auth.verify_id_token(token)


@https_fn.on_request(cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]), timeout_sec=3600)
def tokenize(req: https_fn.Request) -> https_fn.Response:
    user = req_user(req)
    hash = req.get_json()["data"]

    if not user or not hash:
        return https_fn.Response({}, status=413)

    name = f"textbooks/users/{user['uid']}/{hash}/doc.pdf"
    parent = Path(name).parent

    blob = bucket.blob(name)
    file = io.BytesIO()
    blob.download_to_file(file)
    file.seek(0)

    process_file(file, parent)

    db.reference(f"users/{user['uid']}/textbooks").push(
        {
            "name": parent.name,
            "path": str(parent),
        }
    )

    sendTokenizedEmail(user["email"])

    return https_fn.Response({})


def wolfImage(question: str):
    url = question
    encoded_url = quote(url)
    req = requests.get("http://api.wolframalpha.com/v1/simple?appid=" + ID + "&i=" + encoded_url)

    if req.status_code != 200:
        return wolfShort(question)

    img = Image.open(io.BytesIO(req.content))
    # img.show()

    return img


def wolfShort(question: str):
    url = question
    encoded_url = quote(url)
    req = requests.get("http://api.wolframalpha.com/v1/result?appid=" + ID + "&i=" + encoded_url)

    if req.status_code != 200:
        return wolfSteps(question)

    return req.text


def wolfSteps(question: str):
    url = question
    encoded_url = quote(url)
    req = requests.get("http://api.wolframalpha.com/v2/query?appid=" + ID + "&i=" + encoded_url)

    if req.status_code != 200:
        # TODO: Use OpenAI to generate a response
        return "Error"

    return req.text


def questionAI(markdown: str):
    results = dict()
    messages = [
        {
            "role": "user",
            "content": f"Please generate exactly five questions in the format 'Q: [Question]' and exactly three flashcards in the format 'F: [Flashcard]' for the following excerpt: {markdown}",
        }
    ]

    response = openai.ChatCompletion.create(model="gpt-3.5-turbo-0613", messages=messages)

    response_message = response["choices"][0]["message"]["content"]
    # print("Raw Response:", response_message)

    questions = [line.replace("Q: ", "", 1) for line in response_message.split("\n") if line.startswith("Q:")]
    flashcards = [line.replace("F: ", "", 1) for line in response_message.split("\n") if line.startswith("F:")]

    results = {"questions": questions, "flashcards": flashcards}

    return results


markdown_excerpt = "Python is an interpreted, high-level, general-purpose programming language. Created by Guido van Rossum and first released in 1991, Python's design philosophy emphasizes code readability with its notable use of significant whitespace."
# print(questionAI(markdown_excerpt))


def process_file(file: io.BytesIO, parent: Path):
    pdfbin = file.read()
    pdf = pypdfium2.PdfDocument(pdfbin)

    # if start is not None and stop is not None:
    #     pages = list(range(start - 1, stop))
    # else:
    #     pages = list(range(len(pdf)))
    pages = list(range(len(pdf)))

    predictions = [""] * len(pages)
    dellist = []

    # if parent.exists():
    #     for computed in (parent / "pages").glob("*.mmd"):
    #         try:
    #             idx = int(computed.stem) - 1
    #             if idx in pages:
    #                 i = pages.index(idx)
    #                 print("skip page", idx + 1)
    #                 predictions[i] = computed.read_text(encoding="utf-8")
    #                 dellist.append(idx)
    #         except Exception as e:
    #             print(e)

    compute_pages = pages.copy()
    for el in dellist:
        compute_pages.remove(el)

    images = rasterize_paper(pdf, pages=compute_pages)

    dataset = ImageDataset(
        images,
        partial(model.encoder.prepare_input, random_padding=False),
    )

    dataloader = torch.utils.data.DataLoader(
        dataset,
        batch_size=NOUGAT_BATCHSIZE,
        pin_memory=True,
        shuffle=False,
    )

    for idx, sample in tqdm(enumerate(dataloader), total=len(dataloader)):
        if sample is None:
            continue

        model_output = model.inference(image_tensors=sample, early_stopping=False)

        for j, output in enumerate(model_output["predictions"]):
            # if model_output["repeats"][j] is not None:
            #     if model_output["repeats"][j] > 0:
            #         disclaimer = "\n\n+++ ==WARNING: Truncated because of repetitions==\n%s\n+++\n\n"
            #     else:
            #         disclaimer = (
            #             "\n\n+++ ==ERROR: No output for this page==\n%s\n+++\n\n"
            #         )
            #     rest = close_envs(model_output["repetitions"][j]).strip()
            #     if len(rest) > 0:
            #         disclaimer = disclaimer % rest
            #     else:
            #         disclaimer = ""
            # else:
            #     disclaimer = ""

            predictions[pages.index(compute_pages[idx * NOUGAT_BATCHSIZE + j])] = (
                markdown_compatible(output)  # + disclaimer
            )

    # (parent / "pages").mkdir(parents=True, exist_ok=True)
    # pdf.save(parent / "doc.pdf")

    # file.seek(0)
    # bucket.blob(str(parent / "doc.pdf")).upload_from_file(file)

    if len(images) > 0:
        thumb = Image.open(images[0])
        thumb.thumbnail((400, 400))
        buffer = io.BytesIO()
        thumb.save(buffer, format="webp")
        buffer.seek(0)
        bucket.blob(str(parent / "thumb.webp")).upload_from_file(buffer, content_type="image/webp")

    for idx, page_num in enumerate(pages):
        bucket.blob(str(parent / "pages" / ("%02d.mmd" % (page_num + 1)))).upload_from_string(
            predictions[idx], content_type="text/markdown"
        )
        problems_questions = questionAI(predictions[idx])
        questions_save = problems_questions["questions"]
        flashcard_save = problems_questions["flashcards"]
        for i, question in enumerate(questions_save):
            answer = wolfImage(question)
            # if isinstance(answer, str):
            #     # answer = answer.encode("utf-8")
            #     answer
            # elif isinstance(answer, bytes):
            #     answer = io.BytesIO(answer)
            #     answer.seek(0)
            # else:
            #     print(type(answer))
            #     answer

            bucket.blob(
                str((parent / "pages" / ("%02d.mmd" % (page_num + 1)) / "questions") / str(i))
            ).upload_from_string(question, content_type="text/markdown")
            bucket.blob(
                str(parent / "pages" / ("%02d.mmd" % (page_num + 1)) / "questions" / str(i))
            ).upload_from_string(answer)
        for i, flashcard in enumerate(flashcard_save):
            bucket.blob(
                str((parent / "pages" / ("%02d.mmd" % (page_num + 1)) / "flashcards") / str(i))
            ).upload_from_string(flashcard, content_type="text/markdown")

    final = "".join(predictions).strip()
    bucket.blob(str(parent / "doc.mmd")).upload_from_string(final, content_type="text/markdown")


def sendTokenizedEmail(user_email: str) -> None:
    email_sender = "mybooktech0@gmail.com"
    email_password = os.getenv("GMAIL_PASSWORD")
    email_receiver = user_email

    subject = "Upload Success MyBook.Study!"
    body = """
    Hello!

    Your file completed uploading.

    -MyBook.Study
    """

    em = EmailMessage()
    em["From"] = email_sender
    em["To"] = email_receiver
    em["Subject"] = subject
    em.set_content(body)

    context = ssl.create_default_context()

    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as smtp:
        smtp.login(email_sender, email_password)
        smtp.sendmail(email_sender, email_receiver, em.as_string())
