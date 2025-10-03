let sessionId = crypto.randomUUID();

function send() {
	const chat = document.getElementById("chat");
	const question = document.getElementById("question").value;

	if (!question.trim()) return;

	const qaContainer = document.createElement("div");
	qaContainer.classList.add("qa-container");

	const userMsg = document.createElement("div");
	userMsg.innerHTML = `<b>You:</b> ${question}`;
	qaContainer.appendChild(userMsg);

	const botMsg = document.createElement("div");
	botMsg.innerHTML = `<b>Bot:</b> <span class="answer"></span>`;
	qaContainer.appendChild(botMsg);

	chat.appendChild(qaContainer);

	const answerEl = botMsg.querySelector(".answer");

	const evtSource = new EventSource(
		`http://localhost:3000/streaming?q=${encodeURIComponent(question)}&sessionId=${sessionId}`
	);

	evtSource.onmessage = (event) => {
		console.log(event);
		if (event.data === "[DONE]") {
			evtSource.close();
		} else if (event.data.startsWith("[ERROR]")) {
			answerEl.textContent = "Error on the server";
			evtSource.close();
		} else {
			answerEl.textContent += (event.data !== 'undefined') ? event.data : '';
			chat.scrollTop = chat.scrollHeight;
		}
	};
	document.getElementById("question").value = "";
}

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
	e.preventDefault();

	const fileInput = document.getElementById("fileInput");
	if (!fileInput.files.length) return;

	const formData = new FormData();
	formData.append("file", fileInput.files[0]);

	const res = await fetch("http://localhost:3000/upload", {
		method: "POST",
		body: formData,
	});

	const data = await res.json();
	console.log(data);
	
	document.getElementById("status").textContent = data.message;
});