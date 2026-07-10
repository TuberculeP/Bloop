import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  Unique,
} from "typeorm";
import { UserSample } from "./UserSample";
import { Project } from "./Project";

@Entity("user_sample_project_links")
@Unique(["sample", "project"])
export class UserSampleProjectLink {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => UserSample, { onDelete: "CASCADE" })
  sample: UserSample;

  @Index()
  @Column()
  sampleId: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  project: Project;

  @Index()
  @Column()
  projectId: string;

  @CreateDateColumn()
  createdAt: Date;
}
