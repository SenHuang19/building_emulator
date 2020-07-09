"""

.. module:: client_examples

  :platform: Unix, Windows

  :synopsis: This module tests starting and running a simulation within the JModelica docker.

.. author:: PNNL

"""
# -*- coding: utf-8 -*-
# GENERAL PACKAGE IMPORT
# ----------------------
import requests
import getopt
import os
import csv
import time
import urllib
from utilities import read_input

# ----------------------

def ctrlInitialize(inputs):
  u = {}
  for ind in range(len(inputs)):
    if "_u" in inputs[ind]:
      u[inputs[ind]] = 1e-27
    elif "_activate" in inputs[ind]:
      u[inputs[ind]] = 0
  return u



def main(config):
  # Read config from an external json file
  inputs = read_input(config)
  
  for key in inputs:


       url = inputs[key]['url']

       start = eval(inputs[key]['start'])
     
       duration = inputs[key]['duration']    
     
       step = inputs[key]['step']    
     
       input_point = inputs[key]['input_point']

       control_point = inputs[key]['control_point']

       faults = inputs[key]['fault'] 
       
       # PREPARE OUTPUT FILE
       # -------------       
       measurement_tags = requests.get('{0}/measurements'.format(url)).json()
       outFileName = "{}_results.csv".format(key)
       if os.path.exists(outFileName):
          os.remove(outFileName)
          outFile = open(outFileName, "w", newline = "")
          writer = csv.DictWriter(outFile, fieldnames = sorted(measurement_tags))
          writer.writeheader()
       else:
          outFile = open(outFileName, "w", newline = "")
          writer = csv.DictWriter(outFile, fieldnames = sorted(measurement_tags))
          writer.writeheader()         
       

       # RUN SIMULATION
       # -------------
       # Reset simulation
       print('Resetting simulation to start in a certain day of year at a certain time in seconds.')
       res = requests.put('{0}/reset'.format(url), data = {'start': start})
       # Set simulation step
       print('Setting simulation step to {0}.'.format(step))
       res = requests.put('{0}/step'.format(url), data = {'step': step})
       print('============ Started running simulation for {} ============\n'.format(key))
       timeStep = 1
       # Initialize u
       input = requests.get('{0}/inputs'.format(url)).json()
       u = ctrlInitialize(input)
       # Simulation Loop
       while timeStep <= int(duration/step):
            # Advance simulation
            y = requests.post('{0}/advance'.format(url), data = u).json()
            for j in range(len(input_point)):

               # Measurement from the previous step
               measurement = y[input_point[j]]

               # Add bias Air Temperature measurement
               control_value = eval(faults[j].format(measurement))

               # Write biased value to the control input of Air Temperature of selected floor and zone
               u['{}_u'.format(control_point)] = control_value

               # Activate Air Temperature measurement of selected floor and zone
               u['{}_activate'.format(control_point)] = 1

               # Updated u is passed to the emulator through the "advance" call above

            print("Simulated step {0}.".format(timeStep))
            timeStep += 1
            print("Current time {0} seconds.\n".format(y["time"]))
            writer.writerow(dict(sorted(y.items(), key = lambda x: x[0])))

       print('============= Simulation complete. =================\n')
  # -------------

if __name__ == "__main__":
  import sys
  main(sys.argv[1])
