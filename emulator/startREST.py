"""
.. module:: startREST

  :platform: Unix, Windows

  :synopsis: This module implements the REST API used to interact with the test case. The API is implemented using the ``flask`` package. 

.. moduleauthor:: PNNL
"""
# -*- coding: utf-8 -*-
"""
This module implements the REST API used to interact with the test case.  
The API is implemented using the ``flask`` package.  
"""

# GENERAL PACKAGE IMPORT
# ----------------------
import copy
from flask import Flask
from flask_restful import Resource, Api, reqparse


from flask import request
def shutdown_server():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()


import getopt		# for being able to supply input arguments to the script
# ----------------------

# SIMULATION SETUP IMPORT
# -----------------------
from emulatorSetup import emulatorSetup
# -----------------------

# DEFINE REST REQUESTS
# --------------------
class Advance(Resource):
  """Interface to advance the test case simulation."""

  def __init__(self, **kwargs):
    self.case = kwargs["case"]
    self.parser_advance = kwargs["parser_advance"]

  def post(self):
    """
    POST request with input data to advance the simulation one step 
    and receive current measurements.
    """
    u = self.parser_advance.parse_args()
#    print u
    y = self.case.advance(u)
    return y

class Reset(Resource):
  """
  Interface to test case simulation step size.
  """
  
  def __init__(self, **kwargs):
      self.case = kwargs["case"]
      self.parser_reset = kwargs["parser_reset"]

  def put(self):
    """PUT request to reset the test."""
    u = self.parser_reset.parse_args()
    start = u['start']
    self.case.reset(start)
    return start

        
class Step(Resource):
  """Interface to test case simulation step size."""

  def __init__(self, **kwargs):
      self.case = kwargs["case"]
      self.parser_step = kwargs["parser_step"]

  def get(self):
    """GET request to receive current simulation step in seconds."""
    return self.case.get_step()

  def put(self):
    """PUT request to set simulation step in seconds."""
    args = self.parser_step.parse_args()
    step = args['step']
    self.case.set_step(step)
    return step, 201
        
class Inputs(Resource):
  """Interface to test case inputs."""

  def __init__(self, **kwargs):
      self.case = kwargs["case"]
    
  def get(self):
    """GET request to receive list of available inputs."""
    u_list = self.case.get_inputs()
    return u_list
        
class Measurements(Resource):
  """Interface to test case measurements."""

  def __init__(self, **kwargs):
      self.case = kwargs["case"]
    
  def get(self):
    """GET request to receive list of available measurements."""
    y_list = self.case.get_measurements()
    return y_list
        
class Results(Resource):
  """Interface to test case result data."""

  def __init__(self, **kwargs):
      self.case = kwargs["case"]

  def get(self):
    """GET request to receive measurement data."""
    
    Y = self.case.get_results()
    return Y
        
class KPI(Resource):
  """Interface to test case KPIs."""

  def __init__(self, **kwargs):
    self.case = kwargs["case"]
    
  def get(self):
    """GET request to receive KPI data."""
    kpi = self.case.get_kpis()
    return kpi
        
class Name(Resource):
  """Interface to test case name."""

  def __init__(self, **kwargs):
    self.case = kwargs["case"]
    
  def get(self):
    """GET request to receive test case name."""
    return self.case.get_name()
# --------------------

class Info(Resource):
  """Interface to test case info."""

  def __init__(self, **kwargs):
    self.case = kwargs["case"]
    
  def get(self):
    """GET request to receive test case name."""
    
    u = self.case.get_inputs()
    
    y = self.case.get_measurements()
    
    info={}
    
    temp={}
    
    temp['type'] = 'building_office_large'
    
    temp['index'] = '0_1_1' 

    temp['appliances'] = []
       
    #### Building Level ####

    ### Chillers & Boilers & Pumps ###  

    HVAC = {}
    
    HVAC['id'] = 'b_hvac'
    
    HVAC['label'] = 'HVAC'  

    control_inputs = []
    
    measurements = []

    for key in u:
    
        if (key.find('Ch')!=-1 or key.find('Bo')!=-1 or key.find('Pum')!=-1 or key.find('Tow')!=-1) and key.find('activate')==-1:
        
            temp2={'label':'building level control inputs','p_id':key,'p_name':key}
            
            control_inputs.append(temp2)
        
    for key in y:
    
        if key.find('Ch')!=-1 or key.find('Pum')!=-1 or key.find('Tow')!=-1:
        
            temp2={'label':'Power Consumption','p_id':key,'p_name':key}
            
            measurements.append(temp2)
            
        elif key.find('Boi')!=-1:

            temp2={'label':'Gas Consumption','p_id':key,'p_name':key}        
            
            measurements.append(temp2)
            
    HVAC['control_inputs'] = control_inputs  
    
    HVAC['measurements'] = measurements 
    
    temp['appliances'].append(HVAC)

    temp['floors'] = [] 
    
    #### Floor Level ####

    floors = []

    record_dict = {'p_name': "", 'p_id': ""}
    floor_dict = {
                  "f_id": "", 
                  "label": "", 
                  "appliances": [{
                      'measurements':[], 
                      'control_inputs':[]
                  }], 
                  "exogenous": [{
                      'measurements':[], 
                      'control_inputs':[]
                  }],
                  "zones": []
                }

    zone_dict = {
                  "z_id": "", 
                  "label": "", 
                  "appliances": [{
                      'measurements':[], 
                      'control_inputs':[]
                  }], 
                  "exogenous": [{
                      'measurements':[], 
                      'control_inputs':[]
                  }]
                }

    for key in u:

        if key.find('floor')!=1:
        
            floor = key.split('_')[0]
            
            if not floor in floors and floor.find('time')==-1:
              
                   floors.append(floor)
                   
                   floor_dict_instance = copy.deepcopy(floor_dict)
                   floor_dict_instance["f_id"] = floor
                   floor_dict_instance["label"] = "F" + floor.split('floor')[1]
                   
                   temp['floors'].append(floor_dict_instance)
    
    for floor in temp['floors']:
    
        zons = []
        
        for key in u:
        
            if key.find(floor['f_id'])!=-1:
            
                if key.find('zon')!=-1:
                
                      zon = key.split('_')[1]
                
                      if not zon in zons and zon.find('time')==-1:
              
                                 zons.append(zon)
                                 
                                 zone_dict_instance = copy.deepcopy(zone_dict)
                                 zone_dict_instance["z_id"] = zon
                                 zone_dict_instance["label"] = "Z" + zon.split('zon')[1]

                                 floor["zones"].append(zone_dict_instance)
                                 
                elif key.find('activate')==-1:
                
                       control_dict_instance = copy.deepcopy(record_dict)
                       control_dict_instance["p_id"] = key
                       control_dict_instance["p_name"] = key
                       floor["appliances"][0]["control_inputs"].append(control_dict_instance)
                       
        for key in y:        
                       
            if key.find(floor['f_id'])!=-1:
            
                if key.find('zon')==-1:
                
                    measurement_dict_instance = copy.deepcopy(record_dict)
                    measurement_dict_instance["p_id"] = key
                    measurement_dict_instance["p_name"] = key
                    floor["appliances"][0]["measurements"].append(measurement_dict_instance)   

    for floor in temp['floors']:
    
        for zone in floor['zones']:

            keyword = '{}_{}'.format(floor['f_id'], zone['z_id'])
            
            for ukey in u:

                if ukey.find(keyword)!=-1 and ukey.find('activate')==-1:
                
                     control_dict_instance = copy.deepcopy(record_dict)
                     control_dict_instance["p_id"] = key
                     control_dict_instance["p_name"] = key

                     zone["appliances"][0]["control_inputs"].append(control_dict_instance)
            
            for ykey in y:

                if ykey.find(keyword)!=-1:
                
                     measurement_dict_instance = copy.deepcopy(record_dict)
                     measurement_dict_instance["p_id"] = key
                     measurement_dict_instance["p_name"] = key
                     zone["appliances"][0]["measurements"].append(measurement_dict_instance)                    
        
    info.update({"building":temp})

    return info
# --------------------

class Stop(Resource):
  """Interface to test case name."""

  def __init__(self, **kwargs):
    self.case = kwargs["case"]
    
  def put(self):
    """GET request to receive test case name."""
    shutdown_server()
    return 'Server shutting down...'
# --------------------

def main(argv):
  try:
    opts, args = getopt.getopt(argv, "hp:s:", ["help", "fmuPath=", "fmuStep="])
    if not opts:
      print("ERROR: need options and arguments to run.")
      print("Usage: ./startREST.py -p <path to FMU file> -s <FMU step in seconds>")
      sys.exit()
  except getopt.GetoptError:
    print("Wrong option or no input argument! Usage: ./startREST.py -p <path to FMU file> -s <FMU step in seconds>")
    sys.exit(2)
  for opt, arg in opts:
    if  opt in ("-h", "--help"):
      print("Help prompt. Usage: ./startREST.py -p <path to FMU file> -s <FMU step in seconds>")
      sys.exit()
    elif opt in ("-p", "--fmuPath"):
      fmuPath = arg
    elif opt in ("-s", "--fmuStep"):
      fmuStep = int(arg)
  
  # FLASK REQUIREMENTS
  # ------------------
  app = Flask(__name__)
  api = Api(app)
  # ------------------

  # INSTANTIATE SIMULATION
  # ---------------------
  case = emulatorSetup(fmuPath, fmuStep)
  # ---------------------

  # DEFINE ARGUMENT PARSERS
  # -----------------------
  # ``step`` interface
  parser_step = reqparse.RequestParser()
  parser_step.add_argument('step')
  # ``reset`` interface
  parser_reset = reqparse.RequestParser()
  parser_reset.add_argument('start')
  # ``advance`` interface
  parser_advance = reqparse.RequestParser()
  for key in case.u.keys():
    parser_advance.add_argument(key)
  # -----------------------

  # ADD REQUESTS TO API WITH URL EXTENSION
  # --------------------------------------
  api.add_resource(Advance, '/advance', resource_class_kwargs = {"case": case, "parser_advance": parser_advance})
  api.add_resource(Reset, '/reset', resource_class_kwargs = {"case": case, "parser_reset": parser_reset})
  api.add_resource(Step, '/step', resource_class_kwargs = {"case": case, "parser_step": parser_step})
  api.add_resource(Inputs, '/inputs', resource_class_kwargs = {"case": case})
  api.add_resource(Measurements, '/measurements', resource_class_kwargs = {"case": case})
  api.add_resource(Results, '/results', resource_class_kwargs = {"case": case})
  api.add_resource(KPI, '/kpi', resource_class_kwargs = {"case": case})
  api.add_resource(Name, '/name', resource_class_kwargs = {"case": case})
  api.add_resource(Stop, '/stop', resource_class_kwargs = {"case": case})
  api.add_resource(Info, '/info', resource_class_kwargs = {"case": case})
  # --------------------------------------

  app.run(debug=False, host='0.0.0.0')

if __name__ == '__main__':
    import sys
    main(sys.argv[1:])