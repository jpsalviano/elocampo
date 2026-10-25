package com.elocampo.auth.user.service;

import com.elocampo.common.exceptions.NotFoundException;
import com.elocampo.common.exceptions.ValidationErrorException;
import com.elocampo.auth.user.entity.User;
import com.elocampo.auth.user.UserInput;
import com.elocampo.auth.user.UserResponse;
import com.elocampo.auth.user.mapper.UserMapper;
import com.elocampo.auth.user.repository.UserRepository;
import com.elocampo.common.UuidV7;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Validated
@Slf4j
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public UserResponse create(UserInput request) {

        validateUserCreation(request);

        var now = Instant.now().toEpochMilli();

        var userEntity = User.builder()
                .id(UuidV7.generate().toString())
                .email(normalize(request.getEmail()))
                .password(passwordEncoder.encode(request.getPassword()))
                .admin(false)
                .removed(false)
                .createdAt(now)
                .updatedAt(now)
                .build();

        var userSaved = userRepository.save(userEntity);
        var userResponse = UserMapper.toUserResponse(userSaved);

        log.info("User created (id={})", userResponse.id());

        return userResponse;
    }

    @Override
    public Optional<UserResponse> findById(UUID id) {

        return userRepository.findByIdAndRemovedFalse(id.toString()).map(UserMapper::toUserResponse);
    }

    @Override
    public List<UserResponse> findAll() {

        var userList =  userRepository.findAll();

        return userList.stream().map(UserMapper::toUserResponse).toList();
    }

    @Override
    public Optional<UserResponse> findByEmail(String email) {

        return userRepository.findByEmailAndRemovedFalse(normalize(email)).map(UserMapper::toUserResponse);
    }

    @Override
    @Transactional
    public void deactivate(UUID id) {

        var userFound = userRepository.findByIdAndRemovedFalse(id.toString());

        if (userFound.isEmpty()) {
            throw new NotFoundException("User not found");
        }

        userFound.ifPresent(user -> {
            user.setRemoved(true);
            user.setUpdatedAt(Instant.now().toEpochMilli());
            userRepository.save(user);
        });

        log.info("User deactivated (id={})", id);
    }

    @Override
    @Transactional
    public void activate(UUID id) {

        var userFound = userRepository.findById(id.toString());

        if (userFound.isEmpty()) {
            throw new NotFoundException("User not found");
        }

        if (!userFound.get().isRemoved()) {
            throw new ValidationErrorException("user already active. Cannot activate an active user");
        }

        userFound.ifPresent(user -> {
            user.setRemoved(false);
            user.setUpdatedAt(Instant.now().toEpochMilli());
            userRepository.save(user);
        });

        log.info("User activated (id={})", id);
    }


    private void validateUserCreation(UserInput request) {

        var userFound = userRepository.findByEmail(normalize(request.getEmail()));

        if (userFound.isPresent()) {
            throw new ValidationErrorException("An user with this email already exists");
        }
    }


    static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
