const readableToAsyncIterable = (stream) => {
	const reader = stream.getReader();
	return {
		async *[Symbol.asyncIterator]() {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					yield value;
				}
			} finally {
				reader.releaseLock();
			}
		},
	};
};

module.exports = readableToAsyncIterable;
