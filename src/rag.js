require('dotenv/config');
const { ChatOpenAI, OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const { createStuffDocumentsChain } = require('langchain/chains/combine_documents');
const { createRetrievalChain } = require('langchain/chains/retrieval');
const { RunnableWithMessageHistory } = require("@langchain/core/runnables");
const { InMemoryChatMessageHistory } = require("@langchain/core/chat_history");
const { RunnableLambda } = require("@langchain/core/runnables");

const sessions = new Map();

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
			'If there is not enough information, please state that you cannot provide the documents. '
		],
		new MessagesPlaceholder('chat_history'),
		['human', '{input}'],
	]);

	const combineDocsChain = await createStuffDocumentsChain({
		llm,
		prompt,
	});

	const ragRunnable = new RunnableLambda({
		func: async (values, options) => {
			const docs = await retriever._getRelevantDocuments(values.input);
			return combineDocsChain.invoke(
				{
					input: values.input,
					chat_history: values.chat_history ?? [],
					documents: docs
				},
				options
			);
		},
	});

	const ragWithMemory = new RunnableWithMessageHistory({
		runnable: ragRunnable,
		getMessageHistory: ({ configurable }) => {
			const sessionId = configurable?.sessionId ?? "anon2";
			if (!sessions.has(sessionId)) {
				sessions.set(sessionId, new InMemoryChatMessageHistory());
			}
			return sessions.get(sessionId);
		},
		inputMessagesKey: "input",
		historyMessagesKey: "chat_history",
	});

	return ragWithMemory;
};

module.exports = { rag };

