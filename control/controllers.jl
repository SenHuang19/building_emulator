module con

using Serialization

"""
This module implements an external signal to overwrite existing controllers in the emulator.
"""

function compute_control(y::Dict, list_of_zones::Any)
    # compute the control input from the measurement.
    # y contains the current values of the measurements.
    # {<measurement_name>:<measurement_value>}
    # compute the control input from the measurement.
    # u: dict Defines the control input to be used for the next step.
    # {<input_name> : <input_value>}

    u = Dict();
    merge!(u, Dict("floor1_zon4_oveTSetRooCoo_u" => 295.15,"floor1_zon4_oveTSetRooCoo_activate" => 1))

    return u
end

function initialize(start_inSec::Int64,simStep_inSec::Int64,list_of_zones::Any)
    # u: dict Defines the initial control input to be used for the next step.
    # {<input_name> : <input_value>}

    u = Dict();
    merge!(u, Dict("floor1_zon4_oveTSetRooCoo_oveTRoo_u" => 295.15,"floor1_zon4_oveTSetRooCoo_activate" => 1))

    return u
end

end
