"""
-------------------------------------  Communicate with Controller ------------------
"""
import os
import time
import json
import socket
import requests
import pandas as pd

from os import path
from flask import Flask, request, redirect, jsonify, Response
from flask_pymongo import PyMongo

from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

def requests_retry_session(
	retries=3,
	backoff_factor=0.3,
	status_forcelist=(500, 502, 504),
	session=None,
):
	session = session or requests.Session()
	retry = Retry(
		total=retries,
		read=retries,
		connect=retries,
		backoff_factor=backoff_factor,
		status_forcelist=status_forcelist,
	)

	adapter = HTTPAdapter(max_retries=retry)

	session.mount('http://', adapter)
	session.mount('https://', adapter)
	return session

print("--------------- Initiating Server Directories")

OUTPUT_FOLDER = 'data/'

BMAP_FOLDER = OUTPUT_FOLDER + 'building_maps/'
if not os.path.exists(BMAP_FOLDER):
	os.makedirs(BMAP_FOLDER)

SAPP_FOLDER = OUTPUT_FOLDER + 'selected_appliances/'
if not os.path.exists(SAPP_FOLDER):
	os.makedirs(SAPP_FOLDER)

RESULTS_FOLDER = OUTPUT_FOLDER + 'results/'
if not os.path.exists(RESULTS_FOLDER):
	os.makedirs(RESULTS_FOLDER)

JOBS_JSON = OUTPUT_FOLDER + 'jobs.json'
if not path.exists(JOBS_JSON):
	with open(JOBS_JSON, 'w+') as job_file:
		json.dump(dict(), job_file)

def call_julia(json_data):
    
	print('Connecting')
	
	# Server and port address. Make sure the same address were used in Julia code too! 
	HOST = 'control'
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

'''
	function: create_job
	inputs:
		- bmap: a building map
		- parameters: all the control and measurement parameters of the building
		- job_data: job json keeping latest information about all the jobs
	output:
		- job_data: updated job_json file

	action: create_job function creates a new entry for the new emulator. It will
	create a building map file and a data file for the new emulator. In addition to
	that it will add all the information about particular job to the job json. The 
	source code in job_json depicts the current state.
		- 0: job created
		- 1: initiated controller
		- 2: controller ready
'''
def create_job(bmap, parameters, job_data):

	# get emulator id
	job_id = bmap["id"]

	# save the building map
	map_file = 'buildingMAP_' + job_id + '.json'
	with open(BMAP_FOLDER + map_file, 'w+') as outfile:
		json.dump(bmap, outfile)
	
	# create a data file
	data_file = 'data_' + job_id + '.csv'
	df = pd.DataFrame(columns=parameters)
	df = df.set_index('time')

	# write to csv file
	df.to_csv(RESULTS_FOLDER + data_file)
	
	# new job entry
	entry = dict(map_file=map_file, data_file=data_file, status_code=0, appliance_file="")
	
	# update information
	job_data[job_id] = entry

	return job_data

'''
	function: get_emulators()
	input: none
	output: none

	action: get a list of emulators for the simulation purposes and 
	create a job if doesn't exist using function create_job()
'''
def get_emulators():
	# read the JSON file containing list of emulators and their map files
	# resp = requests.get(site + req)

	# open file - just a sample, we will replace it with the emulator response
	resp = open("data/sample/default_bmap.json")
	emulators = json.load(resp)

	for emulator in emulators:
		print("--------------- Fetching Emulator Information")

		# inputs
		try:
			resp = requests.get(SITE_NAME + '/inputs')
			control_inputs = resp.json()
		except Exception as e:
			print(e)

		# measurements
		try:
			resp = requests.get(SITE_NAME + '/measurements')
			measurements = resp.json()
		except Exception as e:
			print(e)
		
		# all the parameters
		parameters = measurements + control_inputs

		# open job file and load job data
		job_file = open(JOBS_JSON, 'r')
		job_data = json.load(job_file)
		job_file.close()
		
		# create a new job if emulator doesn't exist
		if emulator["id"] not in job_data.keys():
			print("--------------- New Job Found: " + emulator["id"] + "! Creating New Entry")
			job_data = create_job(emulator, parameters, job_data)
		
		# write to json file
		job_file = open(JOBS_JSON, 'w')
		json.dump(job_data, job_file)
		job_file.close()

	print("--------------- Initiating Backend Server")

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
def proxy():
	
	# if requested method is get - step, inputs, measurements, results, kpi, name
	if request.method=='GET':
		resp = requests.get(f'{SITE_NAME}{request.path}')
		if request.path == "/results":
			print(resp.content)

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

@app.route("/update", methods=["GET"])
def update():
	# dummy placeholder
	return 0

"""
-------------------------------------  Communicate with Frontend  ---------------------------------
"""

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

# fetch existing emulator
@app.route("/fetch", methods=["POST"])
def fetch_job():

	# get job information
	job_info = get_job_info(request.json['job_id'])

	# fetch building map of selected emulator
	b_map = get_bmap(job_info["map_file"])
	
	# if user didn't initiate the controller
	if job_info['status_code'] == 0:
		return jsonify({'status_code': 0, 'map':b_map})

	# if user initiated the controller but controller is not predicting - 
	# get parameters for visualization
	elif job_info['status_code'] == 1:	
		parameters = get_parameters(request.json['job_id'])
		return jsonify({'status_code': 1, 'map':b_map, 'parameters': parameters})

# Initiate the controller
@app.route("/initiate", methods=["POST"])
def init_controller():
	
	# call julia controller
	status_code = 0
	try:
		call_julia(request.json['applianceList'])
		status_code = 1
	except:
		print("--------------- Couldn't connect to Julia")

	job_id = request.json['map']['id']

	# save list of appliances
	with open(SAPP_FOLDER + 'appList_' + str(job_id) + '.json', 'w+') as outfile:
		json.dump(request.json['applianceList'], outfile)
	
	# update job json file
	job_file = open(JOBS_JSON, 'r')
	job_data = json.load(job_file)
	job_file.close()
	
	# update appliance list and status code
	job_data[job_id]["appliance_file"] = 'appList_' + str(job_id) + '.json'
	job_data[job_id]["status_code"] = status_code

	# write to json file
	job_file = open(JOBS_JSON, 'w')
	json.dump(job_data, job_file)
	job_file.close()

	response = {'job_id': job_id, 'status_code': status_code}

	# get parameters for visualization
	if status_code == 1:
		parameters = get_parameters(job_id)
		response['parameters'] = parameters
	
	return jsonify(response) 

# access data for a particular emulator instance
@app.route("/data", methods=["POST"])
def get_data():
	# get job information
	job_info = get_job_info(request.json['job_id'])

	# read data
	df = pd.read_csv(RESULTS_FOLDER + job_info["data_file"], index_col=['time'])

	# return data
	return df[request.json['cols']].to_json(orient='records')

def get_bmap(map_file):
	map_file = open(BMAP_FOLDER + map_file, 'r')
	b_map = json.load(map_file)
	map_file.close()

	# return info
	return b_map

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
	
	print("--------------- Connecting to Emulator Server")
	time.sleep(20)
	while True:
		response = requests.get(SITE_NAME + '/step')
		if response.status_code != 200:
			print('--------------- Failed Attempt')
			time.sleep(20)
		else:
			break
	
	print('--------------- Connected to Emulator Server')

	# get emulators
	get_emulators()

	# run the app
	app.run(host='0.0.0.0', port=5000)		
	