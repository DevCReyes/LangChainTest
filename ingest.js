require('dotenv/config');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { DirectoryLoader } = require('langchain/document_loaders/fs/directory');
const { TextLoader } = require('langchain/document_loaders/fs/text');

const main = async () => {
	const loader = new DirectoryLoader('docs', {
		'.txt': (p) => new TextLoader(p)
	});

	const rawDocs = await loader.load();

	const splitter = new RecursiveCharacterTextSplitter({
		chunkSize: 20,
		chunkOverlap: 5
	});

	const docs = await splitter.splitDocuments(rawDocs);

	await Chroma.fromDocuments(
		docs,
		new OpenAIEmbeddings(),
		{
			url: process.env.CHROMA_URL,
			collectionName: 'company-docs',
		}
	);

	console.log(`OK: indexados ${docs.length} chunks`);

}

main().catch(e => {
	console.error(e);
	process.exit(1);
})