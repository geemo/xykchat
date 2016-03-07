var express = require('express');
var app = express();
var httpServer = require('http').createServer(app);
var io = require('socket.io')(httpServer);
var path = require('path');
var port = process.env.PORT || 80;

var chat = require('./routes/chat');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', chat);
app.get('/overtime', function(req, res){
    res.render('overtime');
});

function getPropertyCount(obj){
    var count = 0;
    for(var key in obj){
        ++count;
    }
    return count;
}
function getRoomUserList(room){

    if(io.sockets.adapter.rooms[room]) {
        var arr = [];
        var roomSockets = io.sockets.adapter.rooms[room];
        for (var key in roomSockets) {
            arr.push(roomSockets[key]);
        }
        return arr;
    }
}

var roomsText = ['ROOM-1'];

io.on('connection', function(socket){
    //停留在登录页面的客户，先加入到临时房间notLoginRoom中
    socket.join('notLoginRoom');

    //接受到获取选中房间人数的请求，发送更新人数消息
    socket.on('get selected room user count', function(roomName){
        socket.emit('update selected room user count', {
            room: roomName,
            count: getPropertyCount(io.sockets.adapter.rooms[roomName])
        });
    });

    socket.on('login', function(user){


        //将socket.user与user进行绑定
        socket.user = user;
        //离开临时房间
        socket.leave('notLoginRoom');
        //加入用户请求的房间
        socket.join(user.room);

        io.sockets.adapter.rooms[user.room][socket.id] = user.username;
        //向用户所在的房间广播登录信息
        io.sockets.in(user.room).emit('login', user);


        //向登录页用户广播该房间人数情况
        io.sockets.in('notLoginRoom').emit('update selected room user count',{
            room: user.room,
            count: getPropertyCount(io.sockets.adapter.rooms[user.room])
        });

    });

    socket.on('message', function(message){
        io.sockets.in(message.room).emit('message', message);
    });

    socket.on('get select', function(){
        socket.emit('update select', roomsText);
    });
    socket.on('append select', function(roomText){
        roomsText.push(roomText);
        io.sockets.in('notLoginRoom').emit('push select', roomText);
    });

    socket.on('get user list', function(room){
        //console.log(getRoomUserList(room), room);
        socket.emit('add user list', getRoomUserList(room));
    });

    socket.on('disconnect', function(){
        if(socket.user) {
            //如果退出的用户之前所在的房间不为‘ROOM-1’，且之前所在的房间人数只有他一个，退出后广播给登录页用户更新房间
            if((socket.user.room !== 'ROOM-1') && !(io.sockets.adapter.rooms[socket.user.room])) {

                roomsText.splice(roomsText.indexOf(socket.user.room), 1);
                io.sockets.in('notLoginRoom').emit('update select', roomsText);
            }
            io.sockets.in(socket.user.room).emit('logout', socket.user.username);
            io.sockets.in('notLoginRoom').emit('update selected room user count', {
                room: socket.user.room,
                count: getPropertyCount(io.sockets.adapter.rooms[socket.user.room])
            });
        }
    });
});

httpServer.listen(port);