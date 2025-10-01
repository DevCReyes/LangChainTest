require('dotenv/config');
const { ChatOpenAI, OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const { createStuffDocumentsChain } = require('langchain/chains/combine_documents');
const { createRetrievalChain } = require('langchain/chains/retrieval');

const rag = async () => {
	const llm = new ChatOpenAI({
		model: 'gpt-4o-mini',
		temperature: 0
	});

	const vectorstore = await Chroma.fromExistingCollection(
		new OpenAIEmbeddings(),
		{
			url: process.env.CHROMA_URL,
			collectionName: 'company-docs',
		}
	);

	const retriever = vectorstore.asRetriever({ k: 4 });

	const prompt = ChatPromptTemplate.fromMessages([
		[
			'system',
			'You are a technical assistant. Respond ONLY with information based on {context}. ' +
			'If there is not enough information, please state that you cannot provide the documents. ' +
			'Cite the source where appropriate.'
		],
		new MessagesPlaceholder('chat_history'),
		['human', '{input}'],
	]);

	const combineDocsChain = await createStuffDocumentsChain({
		llm,
		prompt,
	});

	const ragChain = await createRetrievalChain({
		retriever,
		combineDocsChain,
	});

	return ragChain
};

module.exports = { rag };

