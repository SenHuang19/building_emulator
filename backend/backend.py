import socket
import requests
from flask import Flask, request, redirect

# @author: Sai Pushpak Nandanoori 
def CallJulia(Keys,Values):
    
	print('Connecting')
	# Server and port address. Make sure the same address were used in Julia code too! 
	HOST = '127.0.0.1'
	PORT =  65432 
	# Defining the socket 
	s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	s.connect((HOST, PORT))

	# Join all the Key strings to form a single string with -- as demarcation. 
	# On Julia code, same demarcation is used to extract individual Keys
	KeysString = '--'.join(Keys)
	# Parsing the value strings by removing the units 
	# Only float values in the form of strings are sent to Julia
	# These float strings are parsed to extract Float values in Julia
	ValuesWOunits = []
	for i in range(len(Values)):
		temp = Values[i].split(' ')
		ValuesWOunits.append(temp[0])
	ValuesString = '--'.join(ValuesWOunits)

	PubKeys = KeysString
	PubValues = ValuesString


	print('Sending from Python')    
	s.send((PubKeys + '\n').encode())     
	s.send((PubValues + '\n').encode())	  
    
    # After all the data is sent, the code now waits until it receives data in 
    # the socket

    # If the data sent by Julia is larger than the default Bytes size set in 
    # receiving command, then the data is sent in pieces 

	print('Receiving from Julia')
    # Julia sends Keys and Values both in a single string
    # The Keys and values are separated by the delimiter '=='
    # Among Keys and Values, '--' is the delimiter

	JuliaMessage = str() 
	while True:
		chunk = s.recv(10000).decode()
		if not chunk:
			break
		JuliaMessage = ''.join([JuliaMessage, chunk])

	print('Received from Julia')   
	temp = JuliaMessage.split('==')
	SubKeysString = temp[0]
	SubValuesString = temp[1]

	# Need to convert the SubKeysString and SubValuesString to list    
	SubKeys = SubKeysString.split('--') # This commands turns string to list
	SubValuesVector = SubValuesString.split('--')          

	# SubValues = []
	# for i in range(len(SubValuesVector)):
	# 	SubValues.append(float(SubValuesVector[i]))
	SubValues = SubValuesVector
        
    # Final step is to return these output Keys and Values, referred to as 
    # SubKeys and SubValues to the FNCS code.         

	return SubKeys, SubValues

# create a flast app
app = Flask(__name__)

# decorator and function for the home page
@app.route("/advance")
@app.route("/reset")
@app.route("/step")
@app.route("/inputs")
@app.route("/measurements")
@app.route("/results")
@app.route("/kpi")
@app.route("/name")
@app.route("/stop")
def emulator():
	r= requests.get('http://emulator:5000' + request.path)
	return r.content

# main function
if __name__ == '__main__':
	
	# run the app
	app.run(host='0.0.0.0', port=5000)