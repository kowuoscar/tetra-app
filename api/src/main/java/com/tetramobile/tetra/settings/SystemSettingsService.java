package com.tetramobile.tetra.settings;

import com.tetramobile.tetra.settings.dto.ReplaceSystemSettingsRequest;
import com.tetramobile.tetra.settings.dto.SystemSettingsResponse;

public interface SystemSettingsService {
    SystemSettingsResponse getSettings();
    SystemSettingsResponse replaceSettings(ReplaceSystemSettingsRequest request);
    SystemSettings load();
}
