!function(){
    window.Chat = {
        msgObj:document.getElementById("message"),
        username: '',
        room: null,
        socket: null,
        updateSystemMessage: function(username, action){
            //添加系统消息
            var html = '';
            html += '<div class="msg-system">';
            html += username;
            if(action === 'login'){
                html += ' 加入了聊天室';
                var li = document.createElement('li');
                li.innerText = username;

                document.getElementById('user-list').appendChild(li);
            } else {
                html += ' 退出了聊天室';
                var list = document.getElementById('user-list');

                for(var index in list.childNodes){
                    if(list.childNodes[index].innerText === username){
                        list.removeChild(list.childNodes[index]);
                    }
                }
            }
            //html += (action == 'login') ? ' 加入了聊天室' : ' 退出了聊天室';
            html += '</div>';
            var section = document.createElement('section');
            section.className = 'system';
            section.innerHTML = html;
            this.msgObj.appendChild(section);
            this.scrollToBottom();
        },
        scrollToBottom:function(){
            window.scrollTo(0, 999999);
        },
        getUserId: function(){
            return (new Date()).getTime();
        },
        init: function(){
            Chat.socket = io();

            //登录页超时未完成操作将关闭
            var secSpan = document.getElementById('sec');
            var sec = 60;
            var timer = setInterval(function(){
                secSpan.innerHTML = --sec;
                if(sec === 0){
                    //关闭连接
                    Chat.socket.disconnect();
                    //页面重定向
                    self.location = 'overtime';
                    //页面关闭后所有资源被回收，因此不需要清除定时器
                    //window.clearInterval(timer);
                }
            }, 1000);

            //登录前的socket信号处理

            //更新已选择房间的人数
            Chat.socket.on('update selected room user count', function (info) {
                if(document.getElementById('room-select').value === info.room){
                    document.getElementById('count').innerText = info.count;
                }
            });
            Chat.socket.emit('get select');
            Chat.socket.on('update select', function(roomsText){
                var select = document.getElementById('room-select');
                //每次更新select时先将select清空
                select.length = 0;
                for(var index in roomsText) {
                    var option = new Option();
                    option.innerText = roomsText[index];
                    select.appendChild(option);
                }
                Chat.socket.emit('get selected room user count', select.value);
            });
            Chat.socket.on('push select', function(roomText){
                var option = new Option();
                option.innerText = roomText;
                document.getElementById('room-select').appendChild(option);
            });

            Chat.socket.on('add user list', function(userList){
                var ul = document.getElementById('user-list');
                for (var index in userList) {
                    if (userList[index] !== Chat.username) {
                        var li = document.createElement('li');
                        li.innerText = userList[index];

                        ul.appendChild(li);
                    }
                }

            });

            //登录前的设备信号处理（鼠标或键盘）
            //点击join-btn按钮后处理登录
            document.getElementById('join-btn').onclick = function() {
                Chat.joinRoom(timer);
            };
            //点击create-btn后创建房间,
            document.getElementById('create-btn').onclick = function() {
                Chat.createRoom(timer);

            };
            //select改变后，发送更新count请求
            document.getElementById('room-select').onchange = function(){
                Chat.socket.emit('get selected room user count', document.getElementById('room-select').value);
            };
        },
        joinRoom: function(timer){
            if (document.getElementById('nickname-input').value !== '') {
                if(document.getElementById('count').innerText === '10'){
                    alert('房间人数已满, 请稍后进入!');
                } else {
                    //注册成功后清除定时器
                    window.clearInterval(timer);

                    //生成username
                    Chat.username = document.getElementById('nickname-input').value + '(' + Chat.getUserId() + ')';
                    //所在房间
                    Chat.room = document.getElementById('room-select').value;

                    //登录
                    Chat.login({
                        username: Chat.username,
                        room: Chat.room
                    });
                }
            } else {
                document.getElementById('nickname-input').placeholder = '你TM逗我?昵称都没填,还想加入房间?';
            }
        },
        createRoom: function(timer){
            if (document.getElementById('nickname-input').value !== ''){
                //增加选项卡
                var select = document.getElementById('room-select');
                var newOption = new Option();
                var roomNum = parseInt(select.options[select.length - 1].innerText.charAt(5)) + 1;
                var roomText = 'ROOM-' + roomNum;
                newOption.innerText = roomText;
                select.options[select.length] = newOption;
                //发射更新select信号
                Chat.socket.emit('append select', roomText);

                //注册成功后清除定时器
                window.clearInterval(timer);

                //生成username
                Chat.username = document.getElementById('nickname-input').value + '(' + Chat.getUserId() + ')';
                //生成room
                Chat.room = newOption.innerText;

                //登录
                Chat.login({
                    username: Chat.username,
                    room: Chat.room
                });
            } else {
                document.getElementById('nickname-input').placeholder = '你TM逗我?昵称都没填,还想创建房间?';
            }

        },
        login: function(user) {
            //user为内含username,room属性的对象

            Chat.socket.emit('login', {
                username: Chat.username,
                room: Chat.room
            });

            //发送获取房间列表
            Chat.socket.emit('get user list', Chat.room);

            //客户端会自动向指定房间发送login信号，所以无需判断是否为当前房间
            Chat.socket.on('login', function(userInfo){
                if(userInfo.username === Chat.username){
                    //登录后隐藏login-box
                    document.getElementById('login-box').style.display = 'none';
                    //登陆后显示chat-box
                    document.getElementById('chat-box').style.display = 'block';

                    document.getElementById('username').innerText = userInfo.username;
                    document.getElementById('room').innerText = userInfo.room;

                    //登录后需要监听设备信号(鼠标或键盘)
                    document.getElementById('message-input').onkeydown = function (e) {
                        if (e.keyCode === 13) {
                            Chat.sendMessage();
                        }
                    };
                    document.getElementById('message-btn').onclick = function () {
                        Chat.sendMessage();
                    };
                    document.getElementById('logout').onclick = function(){
                        Chat.logout();
                    };
                }
                //登录后更新系统消息
                Chat.updateSystemMessage(userInfo.username, 'login');
            });

            //登录后开启监听message
            Chat.socket.on('message', function(message){
                console.log(message.username + ' : ' + message.content);
                var isme = (message.username === Chat.username) ? true : false;
                var contentDiv = '<div class="message-div">' + message.content + '</div>';
                var usernameDiv = '<div class="name-div">' + message.username + '</div>';

                var section = document.createElement('div');
                if(isme){
                    section.className = 'user-message';
                    //section.innerHTML = contentDiv + usernameDiv;
                } else {
                    section.className = 'service-message';
                    //section.innerHTML = usernameDiv + contentDiv;
                }
                section.innerHTML = usernameDiv + contentDiv;
                Chat.msgObj.appendChild(section);
                Chat.scrollToBottom();
            });

            //登录后开启监听logout
            Chat.socket.on('logout', function(username){
                Chat.updateSystemMessage(username, 'logout')
            });
        },
        logout: function(){
            this.socket.disconnect();
            location.reload();
        },
        sendMessage: function(){
            var messageInput = document.getElementById('message-input');
            if(messageInput.value === ''){
                messageInput.placeholder = '发送数据不能为空!';
            } else {
                var message = {
                    username: Chat.username,
                    room: Chat.room,
                    content: messageInput.value
                };

                Chat.socket.emit('message', message);
                messageInput.value = '';
                messageInput.focus();
            }
        }
    };

    Chat.init();
}();