import json
import socket

def call_julia(json_data):
    
	print('Connecting')
	# Server and port address. Make sure the same address were used in Julia code too! 
	HOST = '127.0.0.1'
	PORT =  65432 
	# Defining the socket 
	s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	s.connect((HOST, PORT))

	s.send((json.dumps(json_data) + '\n').encode())     

	print('Receiving from Julia')
	JuliaMessage = str() 
	while True:
		chunk = s.recv(10000).decode()
		if not chunk:
			break
		JuliaMessage = ''.join([JuliaMessage, chunk])

	print('Received from Julia')   
	print(JuliaMessage)

# main function
if __name__ == '__main__':

	# save list of appliances
	f = open('appList.json')
	appList = json.load(f)
	
	# call julia controller
	call_julia(appList)