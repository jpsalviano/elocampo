package com.elocampo.account;

import lombok.Data;

@Data
public class AccountAddressResponse {

    private String street;
    private String number;
    private String city;
    private String district;
    private String state;
    private String complement;
    private String postalCode;
}
