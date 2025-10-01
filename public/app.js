function send() {
  const chat = document.getElementById("chat");
  const question = document.getElementById("question").value;

  chat.innerHTML += `<div><b>You:</b> ${question}</div>`;
  chat.innerHTML += `<div><b>Bot:</b> <span id="answer"></span></div>`;

  const answerEl = document.getElementById("answer");
  answerEl.textContent = "";

  const evtSource = new EventSource(
    `http://localhost:3000/streaming?q=${encodeURIComponent(question)}`
  );

  evtSource.onmessage = (event) => {
    if (event.data === "[DONE]") {
      evtSource.close();
    } else {	
      answerEl.textContent += (event.data !== 'undefined') ? event.data : '';
      chat.scrollTop = chat.scrollHeight;
    }
  };
}