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

# ----------------------

def ctrlInitialize(inputs):
  u = {}
  for ind in range(len(inputs)):
    if "_u" in inputs[ind]:
      u[inputs[ind]] = 1e-27
    elif "_activate" in inputs[ind]:
      u[inputs[ind]] = 0
  return u


def main(argv):
  # SETUP SIMULATION
  # ---------------

  try:
    opts, args = getopt.getopt(argv, "hu:d:o:l:s:", ["help", "url=", "dayOfYear=", "dayOffset=", "simDuration=", "fmuStep="])
    if not opts:
      print("ERROR: need options and arguments to run.")
      print("Usage: ./runSimulation.py -u <url of FMU machine> -d <day of year to start the simulation> -o <second of day to start the simulation> -l <simulation duration in seconds> -s <FMU step in seconds>")
      sys.exit()
  except getopt.GetoptError:
    print("Wrong option or no input argument! Usage: ./runSimulation.py -u <url of FMU machine> -d <day of year to start the simulation> -o <second of day to start the simulation> -l <simulation duration in seconds> -s <FMU step in seconds>")
    sys.exit(2)
  for opt, arg in opts:
    if  opt in ("-h", "--help"):
      print("Help prompt. Usage: ./runSimulation.py -u <url of FMU machine> -d <day of year to start the simulation> -o <second of day to start the simulation> -l <simulation duration in seconds> -s <FMU step in seconds>")
      sys.exit()
    # Set URL for emulator location
    elif opt in ("-u", "--url"):
      url = arg
    # Set simulation parameters
    elif opt in ("-l", "--simDuration"):
      simDuration = int(arg)
    elif opt in ("-s", "--fmuStep"):
      fmuStep = int(arg)
    elif opt in ("-d", "--dayOfYear"):
      dayOfYear = int(arg)
    elif opt in ("-o", "--dayOffset"):
      dayOffset = int(arg)


  time.sleep(60)



  # GET TEST INFORMATION
  # --------------------
  print('\nSIMULATION SETUP INFORMATION\n---------------------')
  # Test case name
  name = requests.get('{0}/name'.format(url)).json()
  print('Name:\t\t\t\t{0}'.format(name))
  # Inputs available
  inputs = requests.get('{0}/inputs'.format(url)).json()
  print('Control Inputs:\t\t\t{0}'.format(inputs))
  inputFileName = "controlInputsList.csv"
  if os.path.exists(inputFileName):
    os.remove(inputFileName)
    with open(inputFileName, "w", newline = "") as outFile:
      writer = csv.writer(outFile)
      for line in sorted(inputs):
        writer.writerow([line])
  else:
    with open(inputFileName, "w", newline = "") as outFile:
      writer = csv.writer(outFile)
      for line in sorted(inputs):
        writer.writerow([line])
  # Measurements available
  measurements = requests.get('{0}/measurements'.format(url)).json()
  # print('Measurements:\t\t\t{0}'.format(sorted(measurements)))
  measFileName = "measurementsList.csv"
  if os.path.exists(measFileName):
    os.remove(measFileName)
    with open(measFileName, "w", newline = "") as outFile:
      writer = csv.writer(outFile)
      for line in sorted(measurements):
        writer.writerow([line])
  else:
    with open(measFileName, "w", newline = "") as outFile:
      writer = csv.writer(outFile)
      for line in measurements:
        writer.writerow([line])
  outFileName = "results.csv"
  if os.path.exists(outFileName):
    os.remove(outFileName)
    outFile = open(outFileName, "w", newline = "")
    writer = csv.DictWriter(outFile, fieldnames = sorted(measurements))
    writer.writeheader()
  else:
    outFile = open(outFileName, "w", newline = "")
    writer = csv.DictWriter(outFile, fieldnames = sorted(measurements))
    writer.writeheader()
  # Default simulation step
  step_def = requests.get('{0}/step'.format(url)).json()
  print('Default Simulation Step:\t{0}'.format(step_def))
  # --------------------

  # RUN SIMULATION
  # -------------
  # Reset simulation
  print('Resetting simulation to start in a certain day of year at a certain time in seconds.')
  res = requests.put('{0}/reset'.format(url), data = {'start': dayOffset + dayOfYear * 24 * 3600})
  # Set simulation step
  print('Setting simulation step to {0}.'.format(fmuStep))
  res = requests.put('{0}/step'.format(url), data = {'step': fmuStep})
  print('============ Started running simulation ============\n')
  timeStep = 1
  # Initialize u
  u = ctrlInitialize(inputs)
  # Simulation Loop
  while timeStep <= int(simDuration/fmuStep):
    # Advance simulation
    y = requests.post('{0}/advance'.format(url), data = u).json()

    # y holds data output from the emulator

    # Compute next control signal
    #----------
    # Put your code here to change control signals

    # ----------
    # Example 1
    # ----------
    # Injection of bias sensor fault
    # ----------
    bias_example = True # Flag to run bias injection example
    if(bias_example):
      # Select bias amount and sensor location
      bias_degK = 2 # bias temp amount (in degree Kelvin)
      bias_floor = 3 # floor # to apply bias
      bias_zone = 5 # zone # to apply bias

      # Define variable names for Air Temperature of selected floor and zone
      Output_AirTemp_varname = "floor{0}_zon{1}_TRooAir_y".format(bias_floor, bias_zone) # from Output Measurements
      ctrlInput_AirTemp_varname = "floor{0}_zon{1}_oveTRooAir_u".format(bias_floor, bias_zone)  # from Output Measurements
      Activation_AirTemp_varname = "floor{0}_zon{1}_oveTRooAir_activate".format(bias_floor, bias_zone)

      # Measure true sensor value output Air Temperature of selected floor and zone
      output_AirTemp = y[Output_AirTemp_varname]

      # Add bias Air Temperature measurement
      biased_AirTemp = output_AirTemp + bias_degK

      # Check impact of override from previous simulation step
      print("Example 1 Status: Bias Air Temp Sensor Fault")
      print("--Input Air Temp = {0}".format(u[ctrlInput_AirTemp_varname]))
      print("--Output Measured Air Temp before Bias = {0}".format(output_AirTemp))
      print("--Output Measured Air Temp after Bias = {0}".format(biased_AirTemp))

      # Write biased value to the control input of Air Temperature of selected floor and zone
      u[ctrlInput_AirTemp_varname] = biased_AirTemp

      # Activate Air Temperature measurement of selected floor and zone
      u[Activation_AirTemp_varname] = 1

      # Updated u is passed to the emulator through the "advance" call above

    # ----------
    # End Example 1
    # Continue to increment simulation step
    # ----------
    # ----------


    # ----------
    # Example 2
    # ----------
    # Change AHU supply air temperature Set Point
    # ----------
    override_example = True
    if(override_example):

      # Select change location
      override_floor = 3 # floor # to apply change

      # Variable name for
      Output_AHUdischargeAirTempSetPt_varname = "floor{0}_conCoiEco_TSupSetPoiSig_act_y".format(override_floor)
      Output_AHUdischargeAirTemp_varname = "floor{0}_conCoiEco_TSupRead_y".format(override_floor)
      ctrlInput_AHUsupplyAirTemp_varname = "floor{0}_conCoiEco_TSupSetPoiSig_ove_u".format(override_floor)
      Activation_AHUsupplyAirTemp_varname = "floor{0}_conCoiEco_TSupSetPoiSig_ove_activate".format(override_floor)

      # Measure AHU discharge Air Temp Set Point of selected floor
      output_dischargeAirTempSetPt = y[Output_AHUdischargeAirTempSetPt_varname]

      # Measure AHU discharge Air Temp of selected floor
      output_dischargeAirTemp = y[Output_AHUdischargeAirTemp_varname]

      # Check impact of override from previous simulation step
      print("Example 2 Status: Overriding AHU Air Temp")
      print("--Input AHU supply Air Temp Set Point = {0}".format(u[ctrlInput_AHUsupplyAirTemp_varname]))
      print("--Output AHU discharge Air Temp Set Point = {0}".format(output_dischargeAirTempSetPt))
      print("--Output Measured AHU discharge Air Temp = {0}".format(output_dischargeAirTemp))

      # Override AHU discharge Air Temp Set Point of selected floor to the control input
      u[ctrlInput_AHUsupplyAirTemp_varname] = output_dischargeAirTempSetPt

      # Activate Air Temperature measurement of selected floor and zone
      u[Activation_AHUsupplyAirTemp_varname] = 1

      # Updated u is passed to the emulator through the "advance" call above

    # ----------
    # End Example 2
    # Continue to increment simulation step
    # ----------
    # ----------

    #----------
    # u = ins
    print("Simulated step {0}.".format(timeStep))
    timeStep += 1
    print("Current time {0} seconds.\n".format(y["time"]))
    writer.writerow(dict(sorted(y.items(), key = lambda x: x[0])))
  requests.put('{0}/stop'.format(url))
  print('============= Simulation complete. =================\n')
  # -------------

if __name__ == "__main__":
  import sys
  main(sys.argv[1:])
