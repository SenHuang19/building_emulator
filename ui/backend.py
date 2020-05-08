# import libraries
import os.path
from os import path
import uuid
import json
import pandas as pd
from flask import Flask, render_template, request, jsonify, redirect

# create a flast app
app = Flask(__name__)

INPUT_FOLDER = 'input/'

OUTPUT_FOLDER = 'output/'
BMAP_FOLDER = OUTPUT_FOLDER + 'building_maps/'
RESULTS_FOLDER = OUTPUT_FOLDER + 'results/'
JOBS_JSON = OUTPUT_FOLDER + 'jobs.json'

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

# save building map file
def save_map(job_id, buildingMAP):
	with open('output/building_maps/buildingMAP_' + str(job_id) + '.json', 'w+') as outfile:
		json.dump(buildingMAP, outfile)

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
	else:
		# create json file
		with open(JOBS_JSON, 'w+') as job_file:
			job_data = dict()
			job_data[str(job_id)] = entry
			json.dump(job_data, job_file)

# get job info
def get_job_info(job_id):
	# read job file
	job_file = open(JOBS_JSON, 'r')
	job_data = json.load(job_file)
	job_file.close()

	# return info
	return job_data[job_id]

# get list of parameters
def get_parameters(uuid):
	job_info = get_job_info(uuid)
	df = pd.read_csv(RESULTS_FOLDER + job_info["data_file"])
	return list(df.columns.values)

# get data
def get_data(uuid, cols):
	job_info = get_job_info(uuid)
	df = pd.read_csv(RESULTS_FOLDER + job_info["data_file"])
	return df[cols].to_json(orient='records')

# decorator and function for the home page
@app.route("/")
def index():
	job_keys = []
	if path.exists('output/jobs.json'):
		job_file = open('output/jobs.json')
		job_json = json.load(job_file)
		job_keys = list(job_json.keys())
	return render_template('index.html', job_keys=job_keys)

# decorator and function for the home page
@app.route("/query", methods=['GET', 'POST'])
def build():
	# if post request
	if request.method == "POST":
		# to get building hierarchy tree
		if request.json['query_type'] == 'get_btree':
			return jsonify(building_types_JSON);
		# to upload the building map
		elif request.json['query_type'] == 'upload_bmap':
			del request.json['query_type']
			return request.json
		# to get default map of the selected building
		elif request.json['query_type'] == 'get_default_bmap':
			building_JSON['building']['type'] = request.json['build_type']
			building_JSON['building']['index'] = request.json['build_indx']
			return jsonify(building_JSON)
		# to get default list of appliances
		elif request.json['query_type'] == 'get_default_alist':
			return jsonify(default_appliances)
		# save the building, create job_id, and move to data analysis panel
		elif request.json['query_type'] == 'train':
			# create job id and update json
			job_id = str(uuid.uuid1())
			update_job_json(job_id)
			
			# save building map
			save_map(job_id, request.json['map'])
			
			# create and send json response
			data = dict(parameters=get_parameters(job_id), \
						page=render_template('model.html'), \
						uuid=job_id)
			return jsonify(data)
		# fetch model through job id
		elif request.json['query_type'] == 'fetch_model':
			job_id = request.json['uuid']
			parameters = get_parameters(job_id)
			data = dict(parameters=parameters, \
						page=render_template('model.html'), \
						uuid=job_id)
			return jsonify(data)
		# to access data for the selected parameters
		elif request.json['query_type'] == 'get_data':
			job_id = request.json['uuid']
			cols = list(request.json['parameters'])
			cols.append('datetime')

			data = get_data(job_id, cols)
			return data
		# for invalid request
		else:
			return render_template('error_modal.html')
	# get request
	else:
		return render_template('error_modal.html')

# main function
if __name__ == '__main__':
	
	# run the app
	app.run(debug=True)