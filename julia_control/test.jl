using Sockets

#--------------- Main code starts from here ------------------------------------
println("Julia has started and waiting for connection ....")
port = 65432
server = listen(ip"127.0.0.1", port)

while true
	#------------------ Socket communication -----------------------------------
    socket = accept(server)           # open socket
    # println("Opened a socket and started receiving data from Python")
    KeysString = readline(socket)
    ValuesString = readline(socket)

    Message = "Thanks!"
    write(socket, Message)
    close(socket)
end