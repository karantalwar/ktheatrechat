let bettingBox = document.createElement('div')
bettingBox.id = 'betsBox'

function startBets(arg) {
    if (loggedIn) {
        betState = true;
        console.log("Starting bets " + arg)
        getBetOptions()
        document.body.append(bettingBox);
    
        pollCountdown = new Date().getTime() + arg;
        countdownTimer = setInterval(pollTimer, 1000);
    }
}

function stopBets() {
    betState = false;
    console.log("Stopping bets")
    clearInterval(countdownTimer);
    bettingBox.remove()
}

function addBet(characterName) {
    socket.emit('addBet', characterName.currentTarget.dataset.option);
}

function getBetOptions() {
    bettingBox.innerHTML = ''
    $.get(backend + '/bets', (data) => {
        const betHeading = document.createElement('h4')
        betHeading.id = 'betHeading'
        betHeading.textContent = 'Place Your Bets'
        bettingBox.append(betHeading)
        const timer = document.createElement('div')
        timer.id = 'timer'
        bettingBox.append(timer)
        const betsResults = document.createElement('div')
        betsResults.id = "betResults"
        let betOptions = document.createElement('div')
        betOptions.id = "betOptions"
        Object.entries(data).forEach(([key, value]) => {
            if (key != 'visible') {
                const betElement = document.createElement('div')
                const betImage = document.createElement('img')
                betImage.src = "./img/" + key + ".png"
                betElement.append(betImage)
                const betButton = document.createElement('button')
                betButton.dataset.option = key
                betButton.classList.add('bettingButton')
                betButton.textContent = '+1 ' + value.option
                betButton.addEventListener('click', addBet)
                betElement.append(betButton);
                betOptions.append(betElement);
                const resultBox = document.createElement('div')
                resultBox.innerText = '0'
                betsResults.append(resultBox)
            }
        });
        bettingBox.append(betsResults)
        bettingBox.append(betOptions)
    })
}

function getBetResults() {
    $.get(backend + '/bets', (data) => {
        let betText = '';
        Object.entries(data).forEach(([key, value]) => {
            if (key != 'visible') {
                betText += '<div>' + value.count + '</div>';
            }
        });
        var betResults = document.getElementById("betResults");
        //If it isn't "undefined" and it isn't "null", then it exists.
        if (typeof (betResults) != 'undefined' && betResults != null) {
            betResults.innerHTML = betText;
        }
    })
}

socket.on('startBets', startBets)

socket.on('stopBets', stopBets)

socket.on('showBets', getBetResults)

socket.on('disableBets', function() {
    console.log('Disabling betting')
    let bettingButtons = [].slice.call(document.getElementsByClassName('bettingButton'));
    bettingButtons.forEach(function (el) {
        el.removeEventListener('click', addBet)
    });
})