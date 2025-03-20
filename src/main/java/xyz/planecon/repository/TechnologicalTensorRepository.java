package xyz.planecon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import xyz.planecon.model.entity.TechnologicalTensor;
import xyz.planecon.model.entity.TechnologicalTensor.TechnologicalTensorId;

import java.util.List;

@Repository
public interface TechnologicalTensorRepository extends JpaRepository<TechnologicalTensor, TechnologicalTensorId> {
    @Query("SELECT tt FROM TechnologicalTensor tt WHERE tt.instance.id = :instanceId")
    List<TechnologicalTensor> findByInstanceId(@Param("instanceId") Integer instanceId);
}
