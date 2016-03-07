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
    //ͣ���ڵ�¼ҳ��Ŀͻ����ȼ��뵽��ʱ����notLoginRoom��
    socket.join('notLoginRoom');

    //���ܵ���ȡѡ�з������������󣬷��͸���������Ϣ
    socket.on('get selected room user count', function(roomName){
        socket.emit('update selected room user count', {
            room: roomName,
            count: getPropertyCount(io.sockets.adapter.rooms[roomName])
        });
    });

    socket.on('login', function(user){


        //��socket.user��user���а�
        socket.user = user;
        //�뿪��ʱ����
        socket.leave('notLoginRoom');
        //�����û�����ķ���
        socket.join(user.room);

        io.sockets.adapter.rooms[user.room][socket.id] = user.username;
        //���û����ڵķ���㲥��¼��Ϣ
        io.sockets.in(user.room).emit('login', user);


        //���¼ҳ�û��㲥�÷����������
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
            //����˳����û�֮ǰ���ڵķ��䲻Ϊ��ROOM-1������֮ǰ���ڵķ�������ֻ����һ�����˳���㲥����¼ҳ�û����·���
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