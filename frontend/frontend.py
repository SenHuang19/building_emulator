# import libraries
import json
import socket
import os.path
import requests

from os import path
from flask import Flask, render_template, request, jsonify, redirect

# create a flast app
app = Flask(__name__)
SITE = "http://backend:5000"

INPUT_FOLDER = 'input/'

ALLOWED_EXTENSIONS = {'json'}

# read the json file for building selection panel
building_types_file = open(INPUT_FOLDER + 'building_tree.json')
building_types_JSON = json.load(building_types_file)
building_types_file.close()

# default appliance list
default_alist_file = open(INPUT_FOLDER + 'default_alist.json')
default_appliances = json.load(default_alist_file)
default_alist_file.close()

# read the json file for building selection panel
building_file = open(INPUT_FOLDER + 'default_bmap.json')
building_JSON = json.load(building_file)
building_file.close()

# get existing job keys
def get_jobs():
	# send post request to the backend server
	r = requests.post(SITE + '/jobs')

	# read and return response
	return r.json()

# fetch emulator
def fetch_emulator(job_id):
	# send building map and appliance list to the backend server
	data = json.dumps({'job_id':job_id})
	
	# headers for the packet request
	headers = {'content-type': 'application/json'}

	# send post request to the backend server
	r = requests.post(SITE + '/fetch', \
						headers = headers, \
						data = data)

	# read and return response
	return r.json()

# initiate controller
def initiate_controller(buildingMAP, applianceList):
	# send building map and appliance list to the backend server
	data = json.dumps({'map':buildingMAP, 'applianceList': applianceList})
	
	# headers for the packet request
	headers = {'content-type': 'application/json'}

	# send post request to the backend server
	r = requests.post(SITE + '/initiate', \
						headers = headers, \
						data = data)

	# read and return response
	return r.json()

# get data
def get_data(job_id, cols):
	# send building map and appliance list to the backend server
	data = json.dumps({'job_id':job_id, 'cols': cols})
	
	# headers for the packet request
	headers = {'content-type': 'application/json'}

	# send post request to the backend server
	r = requests.post(SITE + '/data', \
						headers = headers, \
						data = data)

	# read and return response
	return r.json()

# decorator and function for the home page
@app.route("/")
def index():
	# get jobs
	res = get_jobs()

	# render index page with a list of jobs
	return render_template('index.html', job_keys=res['job_keys'])

# decorator and function for the home page
@app.route("/query", methods=['GET', 'POST'])
def build():
	# if post request
	if request.method == "POST":
		
		# to get building hierarchy tree
		if request.json['query_type'] == 'get_btree':
			return jsonify(building_types_JSON);
		
		# to get default map of the selected building
		elif request.json['query_type'] == 'get_default_bmap':
			building_JSON['building']['type'] = request.json['build_type']
			building_JSON['building']['index'] = request.json['build_indx']
			return jsonify(building_JSON)
		
		# to get default list of appliances
		elif request.json['query_type'] == 'get_default_alist':
			return jsonify(default_appliances)
		
		# fetch model through job id
		elif request.json['query_type'] == 'fetch_model':
			
			# fetch controller
			job_id = request.json['job_id']
			
			# JSON packet for UI
			data = fetch_emulator(job_id)
			if data['status_code'] == 1:
 				data['page']=render_template('model.html')

			# return the json packet
			return jsonify(data)
		
		# save the building, create job_id, and move to data analysis panel
		elif request.json['query_type'] == 'train':
			
			# initiate controller
			data = initiate_controller(request.json['map'], request.json['appliances'])
			if data['status_code'] == 1:
 				data['page']=render_template('model.html')

			return jsonify(data)
		
		# to access data for the selected parameters
		elif request.json['query_type'] == 'get_data':
			
			# get job id
			job_id = request.json['job_id']

			# get selected columns
			cols = list(request.json['parameters'])
			
			# get data
			res = get_data(job_id, cols)
			
			# return data
			return jsonify(res)
		
		# for invalid request
		else:
			return render_template('error_modal.html')
	
	# get request
	else:
		return render_template('error_modal.html')

# main function
if __name__ == '__main__':
	
	# run the app
	app.run(host='0.0.0.0', port=5000)