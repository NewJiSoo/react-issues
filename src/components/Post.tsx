import { useEffect, useState } from "react"
import instance, { getUserId } from "../api/instance"
import { useParams } from "react-router-dom";

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  views: number;
}

function Post() {
  const [data, setData] = useState<Post | null>(null)
  const { postID } = useParams<{ postID: string }>();
  const loginUserId = getUserId()

  useEffect(() => {
    const postFetch = async () => {
      try {
        const response = await instance.get(`/${postID}/`);
        setData(response.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    postFetch()
  }, [postID])


  return (
    <>
      <div>현재 로그인 유저 : {loginUserId}</div>
      {data &&
        <div>
          <div>author : {data.author}</div>
          <div>title : {data.title}</div>
          <div>content : {data.content}</div>
          <div>views : {data.views}</div>
          <div>-----</div>
        </div>
      }</>
  )
}

export default Post