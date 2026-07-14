import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { SampleFolder } from "./SampleFolder";

@Entity("audio_samples")
export class AudioSample {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  filename: string;

  @Column("float", { default: 0 })
  duration: number;

  @ManyToOne(() => SampleFolder, (folder) => folder.samples, {
    onDelete: "CASCADE",
  })
  folder: SampleFolder;

  @Column()
  folderId: string;

  @Column({ nullable: true })
  previewUrl: string;

  @Column({ nullable: true })
  fullUrl: string;
}
