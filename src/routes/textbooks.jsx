import { useEffect, useState } from "react";

import { auth, functions, storage } from "../firebase";
import {
  ref,
  list,
  getDownloadURL,
  uploadBytesResumable
} from "firebase/storage";
import { httpsCallable } from "firebase/functions";

import {
  theme,
  notification,
  Card,
  Image,
  Tooltip,
  Upload,
  Spin,
  Input,
  Divider,
  Empty
} from "antd";
import { BookTwoTone } from "@ant-design/icons";

import BookPreview from "../components/book-preview";

export default function TextbooksPage() {
  const [userBooks, setUserBooks] = useState();
  const [globalBooks, setGlobalBooks] = useState();
  const [notificationApi, contextHolder] = notification.useNotification();

  const { token } = theme.useToken();

  useEffect(() => {
    async function fetchUserBooks() {
      const { uid } = auth.currentUser;

      const bookRef = ref(storage, `textbooks/users/${uid}`);
      const { prefixes } = await list(bookRef);

      return await Promise.all(
        prefixes.map(async ({ name }) => {
          const thumbRef = ref(
            storage,
            `textbooks/users/${uid}/${name}/thumb.webp`
          );
          const thumb = await getDownloadURL(thumbRef);

          return { hash: name, title: "[TEXTBOOK]", thumb };
        })
      );
    }

    async function fetchGlobalBooks() {
      const bookRef = ref(storage, "textbooks/global");
      const { prefixes } = await list(bookRef);

      return await Promise.all(
        prefixes.map(async ({ name }) => {
          const thumbRef = ref(storage, `textbooks/global/${name}/thumb.webp`);
          const thumb = await getDownloadURL(thumbRef);

          return { hash: name, title: "[TEXTBOOK]", thumb };
        })
      );
    }

    fetchUserBooks().then(setUserBooks);
    fetchGlobalBooks().then(setGlobalBooks);
  }, []);

  async function upload({ file, onProgress, onSuccess, onError }) {
    const buffer = await crypto.subtle.digest(
      "SHA-256",
      await file.arrayBuffer()
    );
    const hash = new Uint8Array(buffer).reduce(
      (data, byte) => data + byte.toString(16).padStart(2, "0"),
      ""
    );

    const { uid } = auth.currentUser;

    const docRef = ref(storage, `textbooks/users/${uid}/${hash}/doc.pdf`);
    const uploadTask = uploadBytesResumable(docRef, file);

    uploadTask.on("state_changed", {
      next(snapshot) {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress({ percent });
      },
      error: onError,
      async complete() {
        notificationApi.success({
          message: "Upload complete",
          description: "Your textbook will be available in nine minutes."
        });

        onSuccess();

        const tokenize = httpsCallable(functions, "tokenize");
        await tokenize(hash);
      }
    });
  }

  return (
    <div>
      {contextHolder}

      <Card
        title="Your Textbooks"
        extra={
          <Input.Search
            placeholder="Search for a textbook"
            allowClear
            enterButton
            size="large"
          />
        }
      >
        {userBooks ? (
          <div className="flex gap-4 flex-wrap">
            <Upload.Dragger
              multiple={true}
              className="w-68 h-88 aspect-[8.5/11]"
              customRequest={upload}
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon">
                <BookTwoTone twoToneColor={token.colorPrimary} />
              </p>
              <p className="ant-upload-text">Upload or drop a textbook here</p>
              <p className="ant-upload-hint">
                Support for a single or bulk upload.
              </p>
            </Upload.Dragger>

            <Image.PreviewGroup
              preview={{
                toolbarRender: () => <></>,
                imageRender: (thumb, { current }) =>
                  userBooks[current] ? (
                    <BookPreview book={userBooks[current]} />
                  ) : (
                    thumb
                  )
              }}
            >
              {userBooks.map((book) => (
                <Tooltip key={book.hash} title={book.title}>
                  <Card
                    className="overflow-hidden w-68 h-88 aspect-[8.5/11]"
                    cover={
                      <Image
                        src={book.thumb}
                        alt={book.title}
                        wrapperClassName="relative w-68 h-88"
                        className="absolute top-[calc(50%-11rem)] left-[calc(50%-8.5rem)]"
                      />
                    }
                    hoverable
                  />
                </Tooltip>
              ))}
            </Image.PreviewGroup>
          </div>
        ) : (
          <div className="flex w-full h-full items-center justify-center">
            <Spin />
          </div>
        )}
      </Card>

      <Divider />

      <Card title="All Textbooks">
        {globalBooks ? (
          <div className="flex gap-4 flex-wrap">
            <Image.PreviewGroup
              preview={{
                toolbarRender: () => <></>,
                imageRender: (thumb, { current }) =>
                  globalBooks[current] ? (
                    <BookPreview book={globalBooks[current]} />
                  ) : (
                    thumb
                  )
              }}
            >
              {globalBooks.length === 0 ? (
                <div className="w-full flex items-center justify-center">
                  <Empty description="No global books" />
                </div>
              ) : (
                globalBooks.map((book) => (
                  <Tooltip key={book.hash} title={book.title}>
                    <Card
                      className="overflow-hidden w-68 h-88 aspect-[8.5/11]"
                      cover={
                        <Image
                          src={book.thumb}
                          alt={book.title}
                          wrapperClassName="relative w-68 h-88"
                          className="absolute top-[calc(50%-11rem)] left-[calc(50%-8.5rem)]"
                        />
                      }
                      hoverable
                    />
                  </Tooltip>
                ))
              )}
            </Image.PreviewGroup>
          </div>
        ) : (
          <div className="flex w-full h-full items-center justify-center">
            <Spin />
          </div>
        )}
      </Card>
    </div>
  );
}
