$(() => {
    document.getElementById('send').addEventListener('click', sendMessageListener);

    document.getElementById('loginWrap').style.zIndex = 100;

    document.getElementById('collapseChat').addEventListener('click', toggleChat);
    document.getElementById('helpButton').addEventListener('click', toggleHelp);
    document.getElementById('helpClose').addEventListener('click', toggleHelp);

    getMessages();
    getShowDetails();
})

socket.on('offlineText', (arg) => {
    document.getElementById('offlineBanner').innerHTML = arg;
})

socket.on('joined', (data) => {
    document.getElementById('userEnter').innerText = '* ' + data + ' entered the theatre *';
    document.getElementById('userEnter').classList.remove('hide');
    setTimeout(function() {
        document.getElementById('userEnter').classList.add('hide');
    }, 5000)
})

socket.on('message', addMessages)

function addMessages(message) {
    if (message != null) {
        const messageBox = document.createElement('p')
        messageBox.innerHTML = `<b>${message.name}:</b> ${message.message}`
        document.getElementById('messages').append(messageBox)
    }
    document.getElementById('messages').scrollTo(0, document.getElementById('messages').scrollHeight);
}

function getMessages() {
    $.get(backend + '/messages', (data) => {
        data.forEach(addMessages);
    })
}

function sendMessage(message) {
    console.log(userName);
    $.post(backend + '/messages', message)
    document.getElementById('message').value = '';
}

function sendMessageListener(event) {
    if (event != undefined) {
        event.preventDefault();
    }
    if (document.getElementById('message').value === null || document.getElementById('message').value == '') {
        document.getElementById('message').placeholder = "Please enter a message"
        document.getElementById('message').value = ''
    } else {
        let message = document.getElementById('message').value;
        sendMessage({
            name: userName,
            message: message
        });
    }
}

function toggleChat() {
    if (chatState) {
        chatState = false;
        document.getElementById('messages').classList.add('hide');
        document.getElementById('message').classList.add('hide');
        document.getElementById('send').classList.add('hide');
    } else {
        chatState = true;
        document.getElementById('messages').classList.remove('hide');
        document.getElementById('message').classList.remove('hide');
        document.getElementById('send').classList.remove('hide');
    }
}

function toggleHelp(event) {
    event.preventDefault();
    if (!document.getElementById('help').classList.contains('hide')) {
        document.getElementById('help').classList.add('hide');
    } else {
        document.getElementById('help').classList.remove('hide');
    }
}

function attemptLogin(event) {
    if (event != undefined) {
        event.preventDefault();
    }
    if (document.getElementById('name').value === null || document.getElementById('name').value == '') {
        document.getElementById('loginStatus').innerHTML = "Please enter a username"
        document.getElementById('loginStatus').classList.remove('hide')
    } else {
        console.log('logging in')
        const loginData = {
            userName: document.getElementById('name').value,
            password: document.getElementById('password').value
        }
        socket.emit("login", loginData);
    }
}

socket.on('loggedIn', () => {
    console.log('Logged in');
    document.getElementById('loginStatus').innerHTML = "Logged In :)";
    userName = document.getElementById('name').value;
    document.getElementById('chatBox').classList.remove('hide');
    document.getElementById('loginWrap').remove();
    document.getElementById('help').classList.add('hide');
    document.getElementById('left-nav').classList.remove('hide');
    document.body.style.backgroundColor = "rgb(0,0,0)";
    document.body.style.color = "rgb(255,255,255)";
    loggedIn = true;
    player = new Twitch.Player("twitch-embed", options);
    player.addEventListener(Twitch.Player.READY, initiate);
    if (player.getCurrentTime()) {
        handleOnline();
    } else {
        handleOffline();
    }
})

socket.on('badPassword', () => {
    console.log('Wrong password')
    document.getElementById('loginStatus').innerHTML = "Incorrect password!"
    document.getElementById('loginStatus').classList.remove('hide')
})

function getShowDetails() {
        $.get(backend + '/getShowDetails', (data) => {
            console.log(data);
            document.getElementById('showTitle').innerText = data.title;
            document.getElementById('showDescription').innerText = data.description;
            dateCountdown = new Date(data.date.toString()).getTime() - 330 // Set time based in India
            countdownTimer = setInterval(dateTimer, 1000);
        });
        
    }

function dateTimer() {
    // Get today's date and time
    var now = new Date();
    var timeOffset = now.getTimezoneOffset()

    // Find the distance between now and the count down date
    var distance = dateCountdown - now.getTime() - ((new Date().getTimezoneOffset() + 330) * 60000) // Time distance on user timezone

    // Time calculations for days, hours, minutes and seconds
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Display the result in the element with id="demo"
    document.getElementById("showTimer").innerHTML = days + "d " + hours + "h " + minutes + "m " + seconds + "s ";

    // If the count down is finished, write some text 
    if (distance < 0) {
        clearInterval(countdownTimer);
        document.getElementById("showTimer").innerHTML = "Now Available To Watch";
        const loginBox = document.getElementById('loginBox')
        const username = document.createElement("input");
        username.setAttribute("type", "text");
        username.setAttribute("name", "username");
        username.setAttribute("id", "name");
        username.setAttribute("placeholder", "name");
        loginBox.append(username)
        const pwd = document.createElement("input");
        pwd.setAttribute("type", "password");
        pwd.setAttribute("name", "password");
        pwd.setAttribute("id", "password");
        pwd.setAttribute("placeholder", "password");
        loginBox.append(pwd)
        const loginButton = document.createElement('button')
        loginButton.setAttribute("type", "submit")
        loginButton.id = "loginButton"
        loginButton.textContent = 'enter'
        loginButton.addEventListener('click', function(event) {
            event.preventDefault()
            attemptLogin()
        })
        loginBox.append(loginButton)
        const loginStatus = document.createElement('div')
        loginStatus.id = "loginStatus"
        loginStatus.classList.add('hide')
        loginBox.append(loginStatus)
    }
}