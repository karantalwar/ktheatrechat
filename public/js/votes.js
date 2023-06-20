let votingBox = document.createElement('div')
votingBox.id = 'votingBox'

function startVoting(arg) {
    if (loggedIn) {
        voteState = true;
        loadVoteOptions();
        console.log("Starting voting")
        document.body.append(votingBox)
    
        pollCountdown = new Date().getTime() + arg;
        countdownTimer = setInterval(pollTimer, 1000);
    }
}

function stopVoting() {
    voteState = false;
    console.log("Stopping voting")
    clearInterval(countdownTimer);
    votingBox.remove()
}

function addVote(option) {
    socket.emit('addVote', option.currentTarget.dataset.voteOption);
    let submittedText = document.createElement('p')
    submittedText.textContent = 'Submitted :)'
    document.getElementById('voteContainer').append(submittedText)

    let votingButtons = [].slice.call(document.getElementsByClassName('votingButton'));
    votingButtons.forEach(function (el) {
        el.removeEventListener('click', addVote)
    });
}

function loadVoteOptions() {
    votingBox.style.zIndex = 1
    votingBox.textContent = ''
    const voteContainer = document.createElement('div')
    voteContainer.id = 'voteContainer'
    $.get(backend + '/votes', (data) => {
        const voteHeading = document.createElement('h4')
        voteHeading.id = 'voteHeading'
        voteHeading.textContent = 'Cast Your Votes'
        voteContainer.append(voteHeading)
        const timer = document.createElement('div')
        timer.id = 'timer'
        voteContainer.append(timer)
        Object.entries(data).forEach(([key, value]) => {
            if (key != 'visible') {
                let voteButton = document.createElement('button')
                voteButton.textContent = value.option
                voteButton.dataset.voteOption = value.option
                voteButton.classList.add('votingButton')
                voteButton.addEventListener('click', addVote)
                voteContainer.append(voteButton)
            }
        });
    })
    votingBox.append(voteContainer)
}

function getVotes() {
    $.get(backend + '/votes', (data) => {
        var voteHeading = document.getElementById("voteHeading");
        //If it isn't "undefined" and it isn't "null", then it exists.
        if (typeof (voteHeading) != 'undefined' && voteHeading != null) {
            voteHeading.textContent = 'RESULTS'
        }

        let numVotes = 0;
        Object.entries(data).forEach(([key, value]) => {
            numVotes += value.count
        })
        const voteButtons = [].slice.call(document.getElementsByClassName('votingButton'))
        Object.entries(data).forEach(([key, value]) => {
            if (key != 'visible') {
                // Check if button has the optionID
                if (voteButtons[key].dataset.voteOption == value.option) {
                    // Calculate percentage of votes
                    let percentage = 0
                    if (numVotes > 0 && value.count > 0) {
                        percentage = (value.count/numVotes) * 100
                    }
                    voteButtons[key].textContent = value.option + ' : ' + percentage + '%'
                }
            }
        });
    })
}

socket.on('showVotes', getVotes)

socket.on('startVoting', startVoting);

socket.on('stopVoting', stopVoting);