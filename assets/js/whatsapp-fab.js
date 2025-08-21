(function () {
  const phone = document.documentElement.getAttribute('data-whatsapp') || '923001234567';
  const message = document.documentElement.getAttribute('data-whatsapp-message') || 'Hello! I have a question';
  const link = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
  const widget = document.createElement('div');
  widget.id = 'whatsapp-chat-widget';
  widget.innerHTML = `
    <div class="wa-widget-send-button">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clip-path="url(#clip0)">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M23.7881 4.06584C21.1709 1.44525 17.69 0.00132957 13.9811 0C6.33875 0 0.118997 6.21909 0.116338 13.8635C0.115008 16.3072 0.75387 18.6925 1.96711 20.7946L0 27.9796L7.34989 26.0517C9.37482 27.1566 11.655 27.7383 13.9752 27.739H13.9811C21.6222 27.739 27.8427 21.5192 27.8453 13.8748C27.8466 10.17 26.406 6.6871 23.7881 4.06651V4.06584ZM13.9811 25.3975H13.9765C11.909 25.3969 9.88075 24.8411 8.1111 23.7914L7.69027 23.5415L3.3286 24.6856L4.49264 20.4329L4.21874 19.9968C3.06533 18.162 2.45572 16.0413 2.45705 13.8642C2.45971 7.51078 7.6291 2.34138 13.9858 2.34138C17.0638 2.34271 19.957 3.54266 22.1328 5.72117C24.3086 7.89902 25.5059 10.7949 25.5046 13.8735C25.5019 20.2275 20.3326 25.3969 13.9811 25.3969V25.3975ZM20.3019 16.7673C19.9556 16.5938 18.2524 15.7561 17.9346 15.6405C17.6169 15.5248 17.3862 15.467 17.1555 15.814C16.9248 16.161 16.2607 16.9415 16.0586 17.1721C15.8565 17.4035 15.6544 17.4321 15.308 17.2585C14.9617 17.085 13.8455 16.7194 12.522 15.5394C11.4922 14.6206 10.7968 13.4866 10.5948 13.1395C10.3926 12.7925 10.5735 12.605 10.7463 12.4329C10.9018 12.2773 11.0926 12.028 11.2661 11.8259C11.4397 11.6238 11.4969 11.4789 11.6125 11.2482C11.7282 11.0168 11.6704 10.8148 11.584 10.6412C11.4975 10.4677 10.8048 8.76253 10.5156 8.06918C10.2344 7.39377 9.94858 7.48551 9.7365 7.47421C9.53439 7.46424 9.30373 7.46225 9.07239 7.46225C8.84104 7.46225 8.46605 7.54867 8.14831 7.89569C7.83056 8.24267 6.93573 9.08097 6.93573 10.7855C6.93573 12.49 8.17693 14.1381 8.35042 14.3694C8.52391 14.6008 10.7935 18.0995 14.2683 19.6006C15.0947 19.9576 15.7402 20.171 16.2434 20.3306C17.0731 20.5945 17.8283 20.5573 18.4252 20.4682C19.0907 20.3685 20.4748 19.6299 20.7633 18.8208C21.0518 18.0117 21.0518 17.3177 20.9654 17.1734C20.879 17.0292 20.6477 16.9421 20.3013 16.7686L20.3019 16.7673Z" fill="white"></path>
        </g>
        <defs><clipPath id="clip0"><rect width="27.8453" height="28" fill="white"/></clipPath></defs>
      </svg>
    </div>
    <div class="wa-chat-bubble">
      <div class="wa-chat-bubble-close-button">&#x2715;</div>
      <div class="wa-chat-bubble-text">Chat with us</div>
    </div>
    <div class="wa-chat-box">
      <div class="wa-chat-box-content-chat-welcome">Hi, there! How can I help you?</div>
      <a rel="noopener" target="_blank" href="${link}" class="wa-chat-box-content-send-btn">Start Chat</a>
    </div>
  `;
  const style = document.createElement('style');
  style.textContent = `
#whatsapp-chat-widget{position:fixed;bottom:18px;right:18px;z-index:60;font-family:sans-serif;}
#whatsapp-chat-widget .wa-widget-send-button{width:56px;height:56px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.2);}
#whatsapp-chat-widget .wa-chat-bubble{background:#25D366;color:#fff;padding:8px 12px;border-radius:16px;margin-bottom:8px;display:flex;align-items:center;}
#whatsapp-chat-widget .wa-chat-bubble-close-button{margin-right:8px;cursor:pointer;}
#whatsapp-chat-widget .wa-chat-box{display:none;position:absolute;bottom:70px;right:0;width:260px;background:#fff;color:#333;box-shadow:0 6px 16px rgba(0,0,0,.2);border-radius:8px;overflow:hidden;}
#whatsapp-chat-widget .wa-chat-box.open{display:block;}
#whatsapp-chat-widget .wa-chat-box-content-chat-welcome{padding:16px;}
#whatsapp-chat-widget .wa-chat-box-content-send-btn{display:block;padding:12px 16px;background:#25D366;color:#fff;text-decoration:none;text-align:center;}
  `;
  document.head.appendChild(style);
  document.body.appendChild(widget);

  const bubble = widget.querySelector('.wa-chat-bubble');
  const bubbleClose = widget.querySelector('.wa-chat-bubble-close-button');
  bubbleClose.addEventListener('click', function () {
    bubble.style.display = 'none';
  });

  const button = widget.querySelector('.wa-widget-send-button');
  const box = widget.querySelector('.wa-chat-box');
  button.addEventListener('click', function () {
    box.classList.toggle('open');
  });
})();

