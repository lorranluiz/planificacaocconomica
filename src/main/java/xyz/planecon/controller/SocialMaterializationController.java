package xyz.planecon.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import xyz.planecon.model.entity.SocialMaterialization;
import xyz.planecon.repository.SocialMaterializationRepository;

import java.util.List;

@RestController
@RequestMapping("/api/social-materializations")
public class SocialMaterializationController {

    @Autowired
    private SocialMaterializationRepository socialMaterializationRepository;

    @GetMapping
    public ResponseEntity<List<SocialMaterialization>> getAllSocialMaterializations() {
        List<SocialMaterialization> materializations = socialMaterializationRepository.findAll();
        return ResponseEntity.ok(materializations);
    }
}