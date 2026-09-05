CREATE TABLE "idempotency_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"operation" varchar(32) NOT NULL,
	"idempotency_key" varchar(160) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'IN_PROGRESS' NOT NULL,
	"response" text,
	"correlation_id" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idempotency_commands" ADD CONSTRAINT "idempotency_commands_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_commands_patient_operation_key_idx" ON "idempotency_commands" USING btree ("patient_id","operation","idempotency_key");