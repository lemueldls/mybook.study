import { useEffect, useState } from "react";
import { PropTypes } from "prop-types";

import { storage } from "../firebase";
import { ref, getBytes } from "firebase/storage";

import { Card, Image, Typography } from "antd";
import { ProCard, ProDescriptions } from "@ant-design/pro-components";

BookPreview.propTypes = {
  book: PropTypes.shape({
    hash: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    thumb: PropTypes.string.isRequired
  }).isRequired
};

export default function BookPreview({ book }) {
  const [html, setHtml] = useState();

  useEffect(() => {
    const textRef = ref(storage, `textbooks/global/${book.hash}/doc.mmd`);
    getBytes(textRef).then((bytes) => {
      const text = new TextDecoder("utf-8").decode(bytes);

      // eslint-disable-next-line no-undef
      const html = render(text);
      setHtml(html);
    });
  }, [book.hash]);

  return (
    <ProCard className="w-200 h-125" split="vertical">
      <ProCard colSpan="30%">
        <ProDescriptions
          column={2}
          title={book.title}
          // tooltip=""
        >
          <ProDescriptions.Item valueType="text" label="Author">
            U.N. Owen
          </ProDescriptions.Item>
        </ProDescriptions>
        <Image src={book.thumb} preview={false} />
      </ProCard>
      <ProCard
        // title={book.title}
        headerBordered
        className="overflow-hidden h-full"
      >
        <div
          className="overflow-auto h-full"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </ProCard>
    </ProCard>
  );
}
