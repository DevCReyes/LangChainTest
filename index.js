const express = require('express');
const cors = require('cors');
const { z } = require('zod');
const { rag } = require('./rag');

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

app.listen(3000, () => console.log('servidor corriendo en http://localhost:3000'));