package com.tetramobile.tetra.phone.dto;

import com.tetramobile.tetra.phone.model.Ownership;
import com.tetramobile.tetra.phone.model.PhoneStatus;

public record UpdatePhoneRequest(
        String model,
        Ownership ownership,
        PhoneStatus status
) {}
