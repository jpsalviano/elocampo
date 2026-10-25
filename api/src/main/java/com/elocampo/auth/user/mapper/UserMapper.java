package com.elocampo.auth.user.mapper;

import com.elocampo.auth.user.UserResponse;
import com.elocampo.auth.user.entity.User;

import java.util.UUID;

public class UserMapper {

    public static UserResponse toUserResponse(User user) {

        return new UserResponse(
                UUID.fromString(user.getId()),
                user.getEmail(),
                user.isAdmin(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
