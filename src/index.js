const express = require('express');
const cors = require('cors');
const { z } = require('zod');
const { rag } = require('./rag');
const readableToAsyncIterable = require('../utils/readAsyncIterable');

const app = express();
app.use(cors());
app.use(express.json());

const AskSchema = z.object({
	question: z.string().min(1)
});

app.post('/ask', async (req, res) => {
	const parse = AskSchema.safeParse(req.body);
	if (!parse.success) return res.status(400).json({ error: 'Bad request' });

	const { question } = parse.data;

	const ragChain = rag();

	const result = await (await ragChain).invoke({ input: question });

	res.json({
		answer: result.answer,
		sources: (result.context ?? []).map((data) => ({
			id: data.id,
			metadata: data.metadata,
		})),
	});

});

app.get('/streaming', async (req, res) => {
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");

	const question = req.query.q;

	try {
		const ragChain = rag();
		const stream = await (await ragChain).stream({ input: question });

		for await (const chunk of readableToAsyncIterable(stream)) {
			res.write(`data: ${chunk.answer}\n\n`);
		}
		res.write("data: [DONE]\n\n");
		res.end();

	} catch (err) {
		console.error("Error on streaming:", err);
		res.write("data: [ERROR]\n\n");
		res.end();
	}

});

app.listen(3000, () => console.log('servidor corriendo en http://localhost:3000'));