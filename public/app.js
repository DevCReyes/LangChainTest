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
    `http://localhost:3000/streaming?q=${encodeURIComponent(question)}`
  );

  evtSource.onmessage = (event) => {
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