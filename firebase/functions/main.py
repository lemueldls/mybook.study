import io
import sys
from functools import partial
from pathlib import Path

# import smtplib

import pypdfium2
import torch
from firebase_admin import db, initialize_app, os, storage
from firebase_functions import storage_fn, https_fn,options
from nougat import NougatModel
from nougat.dataset.rasterize import rasterize_paper
from nougat.postprocessing import markdown_compatible
from nougat.utils.checkpoint import get_checkpoint
from nougat.utils.dataset import ImageDataset
from nougat.utils.device import default_batch_size, move_to_device
from PIL import Image
from tqdm import tqdm

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


@https_fn.on_request(cors=options.CorsOptions(cors_origins="*",cors_methods="post"), timeout_sec=3600)
def upload(req: https_fn.Request) -> https_fn.Response:
    return https_fn.Response(process_file(req.files['file']))

@storage_fn.on_object_finalized(timeout_sec=540)
def tokenize(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]) -> None:
    name = event.data.name
    path = Path(name)
    uid = path.parts[2]

    if uid is not None and name.startswith(f"textbooks/users/{uid}/") and name.endswith("/doc.pdf"):
        blob = bucket.blob(event.data.name)
        file = io.BytesIO()
        blob.download_to_file(file)
        file.seek(0)

        process_file(file, path.parent)

        db.reference(f"users/{uid}/textbooks").push({
            "name": path.parent.name,
            "path": str(path.parent),
            "timestamp": event.data.updated,
        })

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
                markdown_compatible(output) # + disclaimer
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
        bucket.blob(
            str(parent / "pages" / ("%02d.mmd" % (page_num + 1)))).upload_from_string(predictions[idx],
            content_type="text/markdown"
        )

    final = "".join(predictions).strip()
    bucket.blob(str(parent / "doc.mmd")).upload_from_string(final, content_type="text/markdown")

    # def send_email():
    #     sender = "ion know <test@test.com>"
    #     receiver = "Jawad Chowdhury <jawadchy15@gmail.com>"

    #     message = f"""\
    #         Subject: Hi Mailtrap
    #         To: {receiver}
    #         From: {sender}

    #         This is a test e-mail message."""
        
