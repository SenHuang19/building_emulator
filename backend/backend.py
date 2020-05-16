"""
-------------------------------------  Communicate with Controller  ---------------------------------
"""

import socket
import requests
from flask import Flask, request, redirect, jsonify, Response

# @author: Sai Pushpak Nandanoori 
def call_julia_sep(Keys,Values):
    
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

"""
-------------------------------------  Communicate with Emulator  ---------------------------------
"""

# create a flast app
app = Flask(__name__)
SITE_NAME = "http://emulator:5000"

# decorator and function for the emulator connections
@app.route("/advance", methods=["POST"])
@app.route("/reset", methods=["PUT"])
@app.route("/step", methods=["GET", "PUT"])
@app.route("/inputs", methods=["GET"])
@app.route("/measurements", methods=["GET"])
@app.route("/results", methods=["GET"])
@app.route("/kpi", methods=["GET"])
@app.route("/name", methods=["GET"])
@app.route("/stop", methods=["PUT"])
def emulator():
	
	# if requested method is get - step, inputs, measurements, results, kpi, name
	if request.method=='GET':
		resp = requests.get(f'{SITE_NAME}{request.path}')

	# if requested method is post - advance
	elif request.method=='POST':
		resp = requests.post(f'{SITE_NAME}{request.path}', json=request.get_json())

	# if requested method is put - reset, step, stop
	elif request.method=='PUT':
		if request.path == "/stop":
			# no data to parse
			resp = requests.put(f'{SITE_NAME}{request.path}')
		else:
			# need to parse the json data
			resp = requests.put(f'{SITE_NAME}{request.path}', json=request.get_json())

	# remove unnecessary headers
	excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
	headers = [(name, value) for (name, value) in resp.raw.headers.items() if name.lower() not in excluded_headers]
	
	# restructure the response
	response = Response(resp.content, resp.status_code, headers)

	# return the response to the controller
	return response

"""
-------------------------------------  Communicate with Frontend  ---------------------------------
"""
import uuid
import json
import pandas as pd

from os import path

OUTPUT_FOLDER = 'data/'

BMAP_FOLDER = OUTPUT_FOLDER + 'building_maps/'
SAPP_FOLDER = OUTPUT_FOLDER + 'selected_appliances/'

RESULTS_FOLDER = OUTPUT_FOLDER + 'results/'

JOBS_JSON = OUTPUT_FOLDER + 'jobs.json'

@app.route("/jobs", methods=["POST"])
def get_jobs():

	# empty jobs list
	job_keys = []

	# if jobs file exist
	if path.exists(JOBS_JSON):
		job_file = open(JOBS_JSON)				# open file
		job_json = json.load(job_file)			# read json
		job_keys = list(job_json.keys())		# get keys

	# return job keys
	return jsonify({'job_keys': job_keys})

# Initiate the controller
@app.route("/initiate", methods=["POST"])
def init_controller():
	# create job id
	job_id = str(uuid.uuid1())
	
	# save building map
	with open(BMAP_FOLDER + 'buildingMAP_' + str(job_id) + '.json', 'w+') as outfile:
		json.dump(request.json['map'], outfile)
	
	# save list of appliances
	with open(SAPP_FOLDER + 'appList_' + str(job_id) + '.json', 'w+') as outfile:
		json.dump(request.json['applianceList'], outfile)
	
	# update job json file
	update_job_json(job_id)

	# call julia controller
	call_julia(request.json['applianceList'])

	# get parameters for visualization
	parameters = get_parameters(job_id)
	
	return jsonify({'job_id': job_id, 'parameters': parameters}) 

# load selected job
@app.route("/fetch", methods=["POST"])
def fetch_job():
	# get parameters for visualization
	parameters = get_parameters(request.json['job_id'])
	
	return jsonify({'job_id': request.json['job_id'], 'parameters': parameters})

# access data for a particular emulator instance
@app.route("/data", methods=["POST"])
def get_data():
	# get job information
	job_info = get_job_info(request.json['job_id'])

	# read data
	df = pd.read_csv(RESULTS_FOLDER + job_info["data_file"])

	# return data
	return df[request.json['cols']].to_json(orient='records')

# maintain job entries
def update_job_json(job_id):
	# new job entry
	entry = dict(map_file="buildingMAP_" + str(job_id), data_file="all_result.csv")
	
	# read the json file for building selection panel
	if path.exists(JOBS_JSON):

		# read the json file
		job_file = open(JOBS_JSON, 'r')
		job_data = json.load(job_file)
		job_file.close()

		# update information
		job_data[str(job_id)] = entry

		# write to json file
		job_file = open(JOBS_JSON, 'w')
		json.dump(job_data, job_file)
		job_file.close()
	
	# if file doesn't exists
	else:

		# create json file
		with open(JOBS_JSON, 'w+') as job_file:
			job_data = dict()
			job_data[str(job_id)] = entry
			json.dump(job_data, job_file)

# get list of parameters
def get_parameters(job_id):
	job_info = get_job_info(job_id)
	df = pd.read_csv(RESULTS_FOLDER + job_info["data_file"])
	return list(df.columns.values)

# get job info
def get_job_info(job_id):
	# read job file
	job_file = open(JOBS_JSON, 'r')
	job_data = json.load(job_file)
	job_file.close()

	# return info
	return job_data[job_id]

# main function
if __name__ == '__main__':
	
	# run the app
	app.run(host='0.0.0.0', port=5000)