module con

"""
This module implements an external signal to overwrite existing controllers in the emulator.
"""

function compute_control(y::Dict)
    # compute the control input from the measurement.
    # y contains the current values of the measurements.
    # {<measurement_name>:<measurement_value>}
    # compute the control input from the measurement.
    # u: dict Defines the control input to be used for the next step.
    # {<input_name> : <input_value>}

    u = Dict("floor1_zon4_oveTSetRooCoo_u" => 295.15,"floor1_zon4_oveTSetRooCoo_activate" => 1)
    return u
end

function initialize()
    # u: dict Defines the initial control input to be used for the next step.
    # {<input_name> : <input_value>}
    u = Dict("floor1_zon4_oveTSetRooCoo_oveTRoo_u" => 295.15,"floor1_zon4_oveTSetRooCoo_activate" => 1)
    return u
end

end