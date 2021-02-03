function setChat(passed) {
  let chatroom = document.getElementById("chatroom-parent");
  if (chatroom) {
    const div = document.createElement('div');

    div.className = 'row';

    div.innerHTML = `
    <div>
      ${passed}
    </div>
    `;
    chatroom.appendChild(div);
  }
  console.log(passed);
}

module.exports = {
  setChat: setChat
}
