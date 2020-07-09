import json
from collections import OrderedDict

def read_input(input):

   with open(input, 'r') as input_file:
                
        input_data = input_file.readlines()
                
   for i in range(len(input_data)):
                
        input_data[i] = input_data[i].split('###')[0]

   input_data=''.join(input_data) 

   inputs = json.loads(input_data,object_pairs_hook=OrderedDict)
     
   return inputs
