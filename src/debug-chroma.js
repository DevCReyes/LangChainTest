const { ChromaClient } = require('chromadb');

const main = async () => {
  const client = new ChromaClient({ path: process.env.CHROMA_UR });
  const collection = await client.getCollection({ name: "company-docs" });

  const items = await collection.get({
    limit: 5,
  });

  console.log(items);
}

main().catch(console.error);