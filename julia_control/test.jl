using Sockets

#--------------- Main code starts from here ------------------------------------
println("Julia has started and waiting for connection ....")
port = 65432
server = listen(ip"0.0.0.0", port)

while true
	#------------------ Socket communication -----------------------------------
    socket = accept(server)           # open socket
    # println("Opened a socket and started receiving data from Python")
    appList = readline(socket)
    println("Received Data")
    
    Message = "Thanks!"
    write(socket, Message)
    close(socket)
end