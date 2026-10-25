package com.elocampo.account;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AccountAddressInput {

    @NotNull(message = "street is required")
    @jakarta.validation.constraints.Size(max = 100, message = "street is too long")
    private String street;

    @NotNull(message = "number is required")
    @jakarta.validation.constraints.Size(max = 100, message = "number is too long")
    private String number;

    @NotNull(message = "city is required")
    @jakarta.validation.constraints.Size(max = 100, message = "city is too long")
    private String city;

    @NotNull(message = "district is required")
    @jakarta.validation.constraints.Size(max = 100, message = "district is too long")
    private String district;

    @NotNull(message = "state is required")
    @jakarta.validation.constraints.Size(max = 100, message = "state is too long")
    private String state;

    @NotNull(message = "complement is requires")
    @jakarta.validation.constraints.Size(max = 100, message = "complement is too long")
    private String complement;

    @NotNull(message = "postalCode is required")
    @jakarta.validation.constraints.Size(max = 100, message = "postalCode is too long")
    private String postalCode;
}
