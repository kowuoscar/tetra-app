package com.tetramobile.tetra.phone;

import com.tetramobile.tetra.phone.dto.CreatePhoneRequest;
import com.tetramobile.tetra.phone.dto.PhoneSummaryResponse;
import com.tetramobile.tetra.phone.dto.UpdatePhoneRequest;
import com.tetramobile.tetra.shared.security.AuthenticatedUser;

import java.util.List;
import java.util.UUID;

public interface PhoneService {

    List<PhoneSummaryResponse> listPhones(UUID customerId, boolean includeReplaced, AuthenticatedUser caller);

    PhoneSummaryResponse createPhone(UUID customerId, CreatePhoneRequest request);

    PhoneSummaryResponse updatePhone(UUID phoneId, UpdatePhoneRequest request);
}
