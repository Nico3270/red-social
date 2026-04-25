import FeedComponent from "@/feed/componentes/FeedComponent";


export default function InitialPage() {
  return (
    <div className="mb-20 w-full">
      <FeedComponent discoveryContext="home" />
    </div>
  );
}
