function setChat(passed) {
  let chatroom = document.getElementById("chatroom-parent");
  if (chatroom) {
    const div = document.createElement('div');

    const text = document.createTextNode(passed);
    div.className = 'row';

    div.append(text);
    chatroom.appendChild(div);
  }
  console.log(passed);
}

module.exports = {
  setChat: setChat
}
