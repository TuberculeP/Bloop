import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "./User";
import { Project } from "./Project";

@Entity()
@Unique(["user", "project"])
export class ProjectFavorite {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  project: Project;

  @CreateDateColumn()
  createdAt: Date;
}
