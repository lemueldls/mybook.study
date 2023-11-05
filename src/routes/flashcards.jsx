import { useEffect, useState } from "react";

import { storage } from "../firebase";
import { ref, list, getBytes } from "firebase/storage";

import { router } from "../router";

import { PageContainer, ProCard } from "@ant-design/pro-components";
import { Card } from "antd";

export default function FlashCardsPage() {
  const [cards, setCards] = useState([]);

  let book = new URLSearchParams(location.search).get("book");
  if (!book) router.navigate("/app");
  book = atob(book);

  useEffect(() => {
    async function fetchCards() {
      const cardsRef = ref(storage, `${book}/pages/01.mmd/flashcards`);
      const { items } = await list(cardsRef);

      return await Promise.all(
        items.map(async (item) => {
          const cardRef = ref(storage, item.fullPath);

          const decoder = new TextDecoder("utf-8");
          const bytes = await getBytes(cardRef);

          const content = decoder.decode(bytes);
          const [q, a] = content.split("->");

          return { question: render(q), answer: render(a) };
        })
      );
    }

    fetchCards().then(setCards);
  }, [book]);

  return (
    <div className="flex flex-col gap-4 justify-center items-center">
      {cards.map((card, i) => (
        <Card
          key={i}
          bordered
          className="flex items-center relative flex-col gap-8 justify-center text-lg font-semibold w-100 text-center text-balance p-8"
        >
          <div
            className="flashcard__question pb-8"
            dangerouslySetInnerHTML={{ __html: card.question }}
          />
          <div
            className="flashcard__answer"
            dangerouslySetInnerHTML={{ __html: card.answer }}
          />
        </Card>
      ))}
    </div>
  );
}
