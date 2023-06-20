const hostname = '127.0.0.1';
const port = process.env.PORT || 3000;

const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const cors = require('cors');
const server = require('http').createServer(app);

const io = require('socket.io')(server, {
    cors: {
        origin: '*',
    },
});
server.listen(port, function () {
    console.log('Server listening at port %d', port);
});
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json')
const db = low(adapter);

// app.use(express.static(__dirname));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}))
app.options(cors())
app.use(cors())

app.get('/messages', (req, res) => {
    const state = db.getState();
    res.send(state.messages);
})

app.get('/getShowDetails', (req, res) => {
    const state = db.getState();
    res.send(state.show);
})

app.get('/messages/:user', (req, res) => {
    var user = req.params.user;
    let messages = db.get('messages').find({
        name: user
    }).value();
    res.send(messages);
})

app.post('/messages', async (req, res) => {
    try {
        // Check if user has been muted
        const checkUser = db.get('activeUsers').filter({
            name: req.body.name
        }).value()
        // If username is not added to active list
        if (checkUser[0] === undefined) {
            addActiveUser(req.body)
            addMessage(req.body)
        } else {
            if (!checkUser[0].muted) {
                addMessage(req.body)
            } else {
                console.log(req.body.name + ' is muted!')
            }
        }
        
        console.log('Send all messages');
        res.sendStatus(200);
    }
    catch (error) {
        res.sendStatus(500);
        return console.log('error', error);
    } finally {
        console.log('Message Posted')
    }
})

function addActiveUser(messageObj) {
    db.get('activeUsers')
        .push({
            name: messageObj.name,
            muted: false
        })
        .write();
}

function addMessage(messageObj) {
        db.get('messages')
            .push({
                name: messageObj.name,
                message: messageObj.message
            })
            .write();
        console.log('saved');
        // var censored = await Message.findOne({ message: 'badword' });
        // if (censored)
        //     await Message.remove({ _id: censored.id })
        // else
        io.emit('message', messageObj);
}

app.get('/activeUsers', (req, res) => {
    const state = db.getState();
    res.send(state.activeUsers);
})

app.post('/muteUser', async (req, res) => {
    try {
        db.get('activeUsers')
        .find({name: req.body.name})
        .assign({
                muted: (req.body.mute == 'true')
            })
            .write()
    } catch (error) {
        res.sendStatus(500);
        return console.log('error', error);
    } finally {
        console.log(req.body.name + ' mute status is ' + req.body.mute)
    }
})

app.post('/changeShowDetails', async (req, res) => {
    try {
        db.set('show', {
            title: req.body.title,
            description: req.body.description,
            date: req.body.date
        }).write();
        console.log('Change show details to');
        res.sendStatus(200);
    } catch (error) {
        res.sendStatus(500);
        return console.log('error', error);
    } finally {
        console.log('Show details changed');
    }
})

io.on('connection', (socket) => {
    console.log('a user ' + socket.id + ' is connected');

    socket.on("startBets", ()=> {
        console.log("Starting bets")
        let betDuration = db.get('betTime').value()
        const state = db.getState();
        io.emit('startBets', state.betTime);
        let stopBetting = setTimeout(function () {
            console.log("Stopping bets")
            io.emit('disableBets', true);
        }, betDuration)
    })

    socket.on("stopBets", ()=> {
        console.log("Stopping bets")
        io.emit('stopBets', true);
    })

    socket.on("addBet", (args) => {
        console.log("Added a bet")
        const currentCount = db.get('bets.' + args).value();
        db.get('bets.' + args)
            .assign({
                'count': parseInt(currentCount.count) + 1
            }).write();
        io.emit('showBets', args)
    })

    socket.on("resetBets", () => {
        db.get('bets.left').assign({ count: 0 }).write()
        db.get('bets.right').assign({ count: 0 }).write()
        console.log('Reset all bets')
    })

    socket.on("startVoting", ()=> {
        console.log("Starting Voting")
        let voteDuration = db.get('voteTime').value()
        const state = db.getState();
        io.emit('startVoting', state.voteTime);
        let stopVoting = setTimeout(function () {
            console.log("Stopping Voting")
            io.emit('showVotes', true);
        }, voteDuration)
    })

    socket.on("stopVoting", ()=> {
        console.log("Stopping Voting")
        io.emit('stopVoting', true);
    })

    socket.on("addVote", (args) => {
        console.log("Added a new vote to: " + args)
        const currentCount = db.get('votes').find({
            option: args
        }).value();
        db.get('votes').find({
                option: args
            })
            .assign({
                'count': parseInt(currentCount.count) + 1
            }).write();
        io.emit('updateVotes', true)
    })

    socket.on("resetVotes", () => {
        console.log('Reset all Voting')
        db.get('votes').value().forEach((element, index) => {
            db.get('votes[' + index + ']').assign({
                    count: 0
            }).write()
        });
    })

    socket.emit('welcome', {res:"Welcome message"})

    socket.on("offlineText", (arg) => {
        io.emit('offlineText', arg);
        console.log('New Offline Text: ' + arg);
    });

    socket.on("clearChats", (arg) => {
        db.set('messages', [])
            .write()
        console.log('Clearing out chats')
        db.set('activeUsers', [])
            .write()
        console.log('Clearing out users')
        io.emit('message', null);
    });

    socket.on("setViewerPassword", (arg) => {
        db.set('userPassword', arg).write();
        console.log('setting new password for viewers: ' + arg)
    })

    socket.on("login", (arg) => {
        const state = db.getState();
        if (state.userName !== 'harkat-admin') {
            if (state.userPassword === arg.password) {
                console.log(arg.userName + ' Logged in');
                socket.emit('loggedIn');
                socket.broadcast.emit('joined', arg.userName);
            } else {
                console.log('Wrong password');
                socket.emit('badPassword');
            }
        }
    })

    socket.on('disconnect', () => {
        console.log(socket.username + ' disconnected ')
    })

    socket.on("showInfoBox", ()=> {
        console.log("Show info box")
        io.emit('showInfoBox', true);
    })

    socket.on("hideInfoBox", ()=> {
        console.log("Show info box")
        io.emit('hideInfoBox', true);
    })
})

app.get('/bets', (req, res) => {
    const state = db.getState();
    res.send(state.bets);
})

app.get('/startBets', (req, res) => {
    const state = db.getState();
    io.emit('startBets', true);
    res.send(state.bets);
})

app.get('/stopBets', (req, res) => {
    const state = db.getState();
    io.emit('stopBets', true);
    res.send(state.bets);
})

app.get('/votes', (req, res) => {
    const state = db.getState();
    res.send(state.votes);
})

app.get('/startVoting', (req, res) => {
    const state = db.getState();
    io.emit('startVoting', true);
    res.send(state.votes);
})

app.get('/stopVoting', (req, res) => {
    const state = db.getState();
    io.emit('stopVoting', true);
    res.send(state.votes);
})

app.post('/addVoteOption', async (req, res) => {
    try {
        db.get('votes')
            .push({
                option: req.body.name,
                count: 0
            }).write();
        console.log('added option: ' + req.body.name );
        res.sendStatus(200);
    } catch (error) {
        res.sendStatus(500);
        return console.log('error', error);
    } finally {
            console.log('Added another vote option')
    }
});

app.post('/editVoteOption', async (req, res) => {
    try {
        db.get('votes').find({
                option: req.body.oldname
            })
            .assign({
                'option': req.body.newname
            }).write();
        res.sendStatus(200)
    } catch (error) {
        res.sendStatus(500);
        return console.log('error', error);
    } finally {
        console.log('Edited ' + req.body.oldname + ' vote option to ' + req.body.newname)
    }
})

app.post('/editBetOption', async (req, res) => {
    try {
        db.get('bets').find({
                option: req.body.oldname
            })
            .assign({
                'option': req.body.newname
            }).write();
        res.sendStatus(200)
    } catch (error) {
        res.sendStatus(500);
        return console.log('error', error);
    } finally {
        console.log('Edited ' + req.body.oldname + ' vote option to ' + req.body.newname)
    }
})

app.get('/showInfoBox', (req, res) => {
    console.log("Show info box")
    io.emit('showInfoBox', true);
})

app.get('/hideInfoBox', (req, res) => {
    console.log("Hide info box")
    io.emit('hideInfoBox', true);
})