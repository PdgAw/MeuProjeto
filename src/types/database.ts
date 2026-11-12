export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_id: string | null
          dimension: Database["public"]["Enums"]["progress_dimension"] | null
          id: string
          metadata: Json
          occurred_at: string
          ref_id: string | null
          ref_table: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          dimension?: Database["public"]["Enums"]["progress_dimension"] | null
          id?: string
          metadata?: Json
          occurred_at?: string
          ref_id?: string | null
          ref_table?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          dimension?: Database["public"]["Enums"]["progress_dimension"] | null
          id?: string
          metadata?: Json
          occurred_at?: string
          ref_id?: string | null
          ref_table?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          acknowledged_at: string | null
          announcement_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          announcement_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          announcement_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_targets: {
        Row: {
          announcement_id: string
          id: string
          role_key: string | null
          target_id: string | null
          target_type: Database["public"]["Enums"]["audience_type"]
        }
        Insert: {
          announcement_id: string
          id?: string
          role_key?: string | null
          target_id?: string | null
          target_type: Database["public"]["Enums"]["audience_type"]
        }
        Update: {
          announcement_id?: string
          id?: string
          role_key?: string | null
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["audience_type"]
        }
        Relationships: [
          {
            foreignKeyName: "announcement_targets_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          attachments: Json
          author_id: string
          body: string
          created_at: string
          expires_at: string | null
          id: string
          is_pinned: boolean
          notified_at: string | null
          publish_at: string
          requires_ack: boolean
          status: Database["public"]["Enums"]["announcement_status"]
          title: string
          type: Database["public"]["Enums"]["announcement_type"]
          updated_at: string
        }
        Insert: {
          attachments?: Json
          author_id: string
          body: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          notified_at?: string | null
          publish_at?: string
          requires_ack?: boolean
          status?: Database["public"]["Enums"]["announcement_status"]
          title: string
          type?: Database["public"]["Enums"]["announcement_type"]
          updated_at?: string
        }
        Update: {
          attachments?: Json
          author_id?: string
          body?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          notified_at?: string | null
          publish_at?: string
          requires_ack?: boolean
          status?: Database["public"]["Enums"]["announcement_status"]
          title?: string
          type?: Database["public"]["Enums"]["announcement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          created_at: string
          feedback: string | null
          files: Json
          id: string
          link_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          score: number | null
          status: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          files?: Json
          id?: string
          link_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          files?: Json
          id?: string
          link_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          cohort_id: string | null
          created_at: string
          created_by: string | null
          dimension: Database["public"]["Enums"]["progress_dimension"]
          due_at: string | null
          id: string
          instructions: string | null
          lesson_id: string | null
          max_score: number | null
          status: Database["public"]["Enums"]["assignment_status"]
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          dimension?: Database["public"]["Enums"]["progress_dimension"]
          due_at?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          max_score?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          dimension?: Database["public"]["Enums"]["progress_dimension"]
          due_at?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          max_score?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          checked_in_at: string | null
          lesson_id: string
          method: Database["public"]["Enums"]["attendance_method"]
          note: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          checked_in_at?: string | null
          lesson_id: string
          method?: Database["public"]["Enums"]["attendance_method"]
          note?: string | null
          recorded_by?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          checked_in_at?: string | null
          lesson_id?: string
          method?: Database["public"]["Enums"]["attendance_method"]
          note?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_targets: {
        Row: {
          event_id: string
          id: string
          role_key: string | null
          target_id: string | null
          target_type: Database["public"]["Enums"]["audience_type"]
        }
        Insert: {
          event_id: string
          id?: string
          role_key?: string | null
          target_id?: string | null
          target_type: Database["public"]["Enums"]["audience_type"]
        }
        Update: {
          event_id?: string
          id?: string
          role_key?: string | null
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["audience_type"]
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_targets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          event_type: Database["public"]["Enums"]["agenda_type"]
          id: string
          location: string | null
          meeting_url: string | null
          starts_at: string
          title: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["agenda_type"]
          id?: string
          location?: string | null
          meeting_url?: string | null
          starts_at: string
          title: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["agenda_type"]
          id?: string
          location?: string | null
          meeting_url?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_interviews: {
        Row: {
          answers: Json
          candidate_id: string
          completed_at: string | null
          created_at: string
          id: string
          interviewer_id: string | null
          recommendation:
            | Database["public"]["Enums"]["interview_recommendation"]
            | null
          scheduled_at: string | null
          summary: string | null
          template_id: string | null
        }
        Insert: {
          answers?: Json
          candidate_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          interviewer_id?: string | null
          recommendation?:
            | Database["public"]["Enums"]["interview_recommendation"]
            | null
          scheduled_at?: string | null
          summary?: string | null
          template_id?: string | null
        }
        Update: {
          answers?: Json
          candidate_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          interviewer_id?: string | null
          recommendation?:
            | Database["public"]["Enums"]["interview_recommendation"]
            | null
          scheduled_at?: string | null
          summary?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interviews_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "interview_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_status_history: {
        Row: {
          candidate_id: string
          changed_at: string
          changed_by: string | null
          from_status: Database["public"]["Enums"]["admission_status"] | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["admission_status"]
        }
        Insert: {
          candidate_id: string
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["admission_status"] | null
          id?: string
          note?: string | null
          to_status: Database["public"]["Enums"]["admission_status"]
        }
        Update: {
          candidate_id?: string
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["admission_status"] | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["admission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "candidate_status_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          birth_date: string | null
          city: string | null
          company: string | null
          converted_at: string | null
          converted_user_id: string | null
          created_at: string
          email: string | null
          entrepreneurial_stage: string | null
          experience: string | null
          full_name: string
          goals: string | null
          id: string
          lead_source: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          profile_type: Database["public"]["Enums"]["neoleader_track"] | null
          status: Database["public"]["Enums"]["admission_status"]
          target_cohort_id: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          city?: string | null
          company?: string | null
          converted_at?: string | null
          converted_user_id?: string | null
          created_at?: string
          email?: string | null
          entrepreneurial_stage?: string | null
          experience?: string | null
          full_name: string
          goals?: string | null
          id?: string
          lead_source?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          profile_type?: Database["public"]["Enums"]["neoleader_track"] | null
          status?: Database["public"]["Enums"]["admission_status"]
          target_cohort_id?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          city?: string | null
          company?: string | null
          converted_at?: string | null
          converted_user_id?: string | null
          created_at?: string
          email?: string | null
          entrepreneurial_stage?: string | null
          experience?: string | null
          full_name?: string
          goals?: string | null
          id?: string
          lead_source?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          profile_type?: Database["public"]["Enums"]["neoleader_track"] | null
          status?: Database["public"]["Enums"]["admission_status"]
          target_cohort_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_converted_user_id_fkey"
            columns: ["converted_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_target_cohort_id_fkey"
            columns: ["target_cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          capacity: number | null
          code: string | null
          coordinator_id: string | null
          created_at: string
          description: string | null
          ends_on: string | null
          id: string
          name: string
          starts_on: string | null
          status: Database["public"]["Enums"]["cohort_status"]
          updated_at: string
          year: number | null
        }
        Insert: {
          capacity?: number | null
          code?: string | null
          coordinator_id?: string | null
          created_at?: string
          description?: string | null
          ends_on?: string | null
          id?: string
          name: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["cohort_status"]
          updated_at?: string
          year?: number | null
        }
        Update: {
          capacity?: number | null
          code?: string | null
          coordinator_id?: string | null
          created_at?: string
          description?: string | null
          ends_on?: string | null
          id?: string
          name?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["cohort_status"]
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_reviews: {
        Row: {
          candidate_id: string
          comment: string | null
          created_at: string
          decision: Database["public"]["Enums"]["committee_decision"]
          id: string
          reviewer_id: string
          score: number | null
        }
        Insert: {
          candidate_id: string
          comment?: string | null
          created_at?: string
          decision: Database["public"]["Enums"]["committee_decision"]
          id?: string
          reviewer_id: string
          score?: number | null
        }
        Update: {
          candidate_id?: string
          comment?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["committee_decision"]
          id?: string
          reviewer_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "committee_reviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competencies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          message: string | null
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["connection_status"]
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          message?: string | null
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          message?: string | null
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          is_muted: boolean
          joined_at: string
          last_read_at: string
          role: Database["public"]["Enums"]["conversation_role"]
          user_id: string
        }
        Insert: {
          conversation_id: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string
          role?: Database["public"]["Enums"]["conversation_role"]
          user_id: string
        }
        Update: {
          conversation_id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string
          role?: Database["public"]["Enums"]["conversation_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          cohort_id: string | null
          created_at: string
          created_by: string | null
          direct_key: string | null
          id: string
          last_message_at: string | null
          title: string | null
          type: Database["public"]["Enums"]["conversation_type"]
        }
        Insert: {
          avatar_url?: string | null
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          direct_key?: string | null
          id?: string
          last_message_at?: string | null
          title?: string | null
          type: Database["public"]["Enums"]["conversation_type"]
        }
        Update: {
          avatar_url?: string | null
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          direct_key?: string | null
          id?: string
          last_message_at?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "conversations_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_acknowledgements: {
        Row: {
          document_id: string
          read_at: string | null
          signature_provider: string | null
          signature_reference: string | null
          signed_at: string | null
          user_id: string
        }
        Insert: {
          document_id: string
          read_at?: string | null
          signature_provider?: string | null
          signature_reference?: string | null
          signed_at?: string | null
          user_id: string
        }
        Update: {
          document_id?: string
          read_at?: string | null
          signature_provider?: string | null
          signature_reference?: string | null
          signed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_acknowledgements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_acknowledgements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_targets: {
        Row: {
          document_id: string
          id: string
          role_key: string | null
          target_id: string | null
          target_type: Database["public"]["Enums"]["audience_type"]
        }
        Insert: {
          document_id: string
          id?: string
          role_key?: string | null
          target_id?: string | null
          target_type: Database["public"]["Enums"]["audience_type"]
        }
        Update: {
          document_id?: string
          id?: string
          role_key?: string | null
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["audience_type"]
        }
        Relationships: [
          {
            foreignKeyName: "document_targets_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          created_at: string
          document_id: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          document_id: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
          version: number
        }
        Update: {
          created_at?: string
          document_id?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          created_by: string | null
          current_version: number
          description: string | null
          expires_at: string | null
          id: string
          owner_user_id: string | null
          requires_signature: boolean
          status: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          owner_user_id?: string | null
          requires_signature?: boolean
          status?: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          owner_user_id?: string | null
          requires_signature?: boolean
          status?: Database["public"]["Enums"]["document_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          cohort_id: string
          completed_at: string | null
          enrolled_at: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Insert: {
          cohort_id: string
          completed_at?: string | null
          enrolled_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Update: {
          cohort_id?: string
          completed_at?: string | null
          enrolled_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_media: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          experience_id: string
          id: string
          kind: string
          storage_path: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          experience_id: string
          id?: string
          kind?: string
          storage_path?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          experience_id?: string
          id?: string
          kind?: string
          storage_path?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experience_media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_media_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_reflections: {
        Row: {
          application: string | null
          created_at: string
          experience_id: string
          feedback: string | null
          main_learning: string | null
          rating: number | null
          user_id: string
        }
        Insert: {
          application?: string | null
          created_at?: string
          experience_id: string
          feedback?: string | null
          main_learning?: string | null
          rating?: number | null
          user_id: string
        }
        Update: {
          application?: string | null
          created_at?: string
          experience_id?: string
          feedback?: string | null
          main_learning?: string | null
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_reflections_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_reflections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_registrations: {
        Row: {
          checked_in_at: string | null
          experience_id: string
          registered_at: string
          status: Database["public"]["Enums"]["registration_status"]
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          experience_id: string
          registered_at?: string
          status?: Database["public"]["Enums"]["registration_status"]
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          experience_id?: string
          registered_at?: string
          status?: Database["public"]["Enums"]["registration_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_registrations_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          capacity: number | null
          category: Database["public"]["Enums"]["experience_category"]
          cohort_id: string | null
          companies: string[]
          cover_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          guests: string | null
          id: string
          is_educational: boolean
          location: string | null
          owner_id: string | null
          registration_deadline: string | null
          registration_open: boolean
          starts_at: string
          status: Database["public"]["Enums"]["experience_status"]
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          category: Database["public"]["Enums"]["experience_category"]
          cohort_id?: string | null
          companies?: string[]
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          guests?: string | null
          id?: string
          is_educational?: boolean
          location?: string | null
          owner_id?: string | null
          registration_deadline?: string | null
          registration_open?: boolean
          starts_at: string
          status?: Database["public"]["Enums"]["experience_status"]
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          category?: Database["public"]["Enums"]["experience_category"]
          cohort_id?: string | null
          companies?: string[]
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          guests?: string | null
          id?: string
          is_educational?: boolean
          location?: string | null
          owner_id?: string | null
          registration_deadline?: string | null
          registration_open?: boolean
          starts_at?: string
          status?: Database["public"]["Enums"]["experience_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiences_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_businesses: {
        Row: {
          company_name: string
          created_at: string
          current_position: string | null
          employees_range: string | null
          future_position: string | null
          generation: string | null
          governance_notes: string | null
          id: string
          management_notes: string | null
          owner_id: string
          professionalization_notes: string | null
          sector: string | null
          share_with_mentors: boolean
          strategic_plan_notes: string | null
          structure: string | null
          succession_notes: string | null
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          current_position?: string | null
          employees_range?: string | null
          future_position?: string | null
          generation?: string | null
          governance_notes?: string | null
          id?: string
          management_notes?: string | null
          owner_id: string
          professionalization_notes?: string | null
          sector?: string | null
          share_with_mentors?: boolean
          strategic_plan_notes?: string | null
          structure?: string | null
          succession_notes?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          current_position?: string | null
          employees_range?: string | null
          future_position?: string | null
          generation?: string | null
          governance_notes?: string | null
          id?: string
          management_notes?: string | null
          owner_id?: string
          professionalization_notes?: string | null
          sector?: string | null
          share_with_mentors?: boolean
          strategic_plan_notes?: string | null
          structure?: string | null
          succession_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_adjustments: {
        Row: {
          agreement_id: string
          amount: number | null
          approved_by: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["adjustment_kind"]
          percent: number | null
          reason: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          agreement_id: string
          amount?: number | null
          approved_by?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["adjustment_kind"]
          percent?: number | null
          reason?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          agreement_id?: string
          amount?: number | null
          approved_by?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["adjustment_kind"]
          percent?: number | null
          reason?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_adjustments_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "financial_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_agreements: {
        Row: {
          cohort_id: string | null
          contract_document_id: string | null
          created_at: string
          created_by: string | null
          id: string
          installments_count: number
          notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["agreement_status"]
          student_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          cohort_id?: string | null
          contract_document_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          installments_count?: number
          notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["agreement_status"]
          student_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          cohort_id?: string | null
          contract_document_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          installments_count?: number
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["agreement_status"]
          student_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_agreements_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_agreements_contract_document_id_fkey"
            columns: ["contract_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_agreements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          dimension: Database["public"]["Enums"]["progress_dimension"]
          due_date: string | null
          id: string
          owner_id: string
          progress: number
          session_id: string | null
          source: Database["public"]["Enums"]["goal_source"]
          status: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dimension?: Database["public"]["Enums"]["progress_dimension"]
          due_date?: string | null
          id?: string
          owner_id: string
          progress?: number
          session_id?: string | null
          source?: Database["public"]["Enums"]["goal_source"]
          status?: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dimension?: Database["public"]["Enums"]["progress_dimension"]
          due_date?: string | null
          id?: string
          owner_id?: string
          progress?: number
          session_id?: string | null
          source?: Database["public"]["Enums"]["goal_source"]
          status?: Database["public"]["Enums"]["goal_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentoring_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_templates: {
        Row: {
          created_at: string
          fields: Json
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          fields?: Json
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          fields?: Json
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      journey_completions: {
        Row: {
          completed_at: string
          milestone_id: string
          note: string | null
          recorded_by: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          milestone_id: string
          note?: string | null
          recorded_by?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          milestone_id?: string
          note?: string | null
          recorded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_completions_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "journey_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_completions_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_milestones: {
        Row: {
          cohort_id: string | null
          created_at: string
          description: string | null
          experience_id: string | null
          id: string
          kind: Database["public"]["Enums"]["journey_item_kind"]
          panel_round_id: string | null
          planned_end: string | null
          planned_start: string | null
          requirements: Json
          sort_order: number
          subject_id: string | null
          title: string
        }
        Insert: {
          cohort_id?: string | null
          created_at?: string
          description?: string | null
          experience_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["journey_item_kind"]
          panel_round_id?: string | null
          planned_end?: string | null
          planned_start?: string | null
          requirements?: Json
          sort_order?: number
          subject_id?: string | null
          title: string
        }
        Update: {
          cohort_id?: string | null
          created_at?: string
          description?: string | null
          experience_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["journey_item_kind"]
          panel_round_id?: string | null
          planned_end?: string | null
          planned_start?: string | null
          requirements?: Json
          sort_order?: number
          subject_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_milestones_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_milestones_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_milestones_panel_round_id_fkey"
            columns: ["panel_round_id"]
            isOneToOne: false
            referencedRelation: "panel_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_milestones_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          description: string | null
          higher_is_better: boolean
          id: string
          is_system: boolean
          key: string
          name: string
          unit: Database["public"]["Enums"]["kpi_unit"]
        }
        Insert: {
          description?: string | null
          higher_is_better?: boolean
          id?: string
          is_system?: boolean
          key: string
          name: string
          unit?: Database["public"]["Enums"]["kpi_unit"]
        }
        Update: {
          description?: string | null
          higher_is_better?: boolean
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          unit?: Database["public"]["Enums"]["kpi_unit"]
        }
        Relationships: []
      }
      lesson_materials: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string | null
          id: string
          is_published: boolean
          kind: Database["public"]["Enums"]["material_kind"]
          lesson_id: string | null
          mime_type: string | null
          size_bytes: number | null
          storage_path: string | null
          subject_id: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          is_published?: boolean
          kind?: Database["public"]["Enums"]["material_kind"]
          lesson_id?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          subject_id: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          is_published?: boolean
          kind?: Database["public"]["Enums"]["material_kind"]
          lesson_id?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          subject_id?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_materials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          checkin_code: string | null
          checkin_open: boolean
          cohort_id: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          guest_name: string | null
          guest_title: string | null
          id: string
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          location: string | null
          meeting_url: string | null
          modality: Database["public"]["Enums"]["lesson_modality"]
          online_provider: Database["public"]["Enums"]["online_provider"] | null
          room: string | null
          starts_at: string
          status: Database["public"]["Enums"]["lesson_status"]
          subject_id: string
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          checkin_code?: string | null
          checkin_open?: boolean
          cohort_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          guest_name?: string | null
          guest_title?: string | null
          id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          location?: string | null
          meeting_url?: string | null
          modality?: Database["public"]["Enums"]["lesson_modality"]
          online_provider?:
            | Database["public"]["Enums"]["online_provider"]
            | null
          room?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["lesson_status"]
          subject_id: string
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          checkin_code?: string | null
          checkin_open?: boolean
          cohort_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          guest_name?: string | null
          guest_title?: string | null
          id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          location?: string | null
          meeting_url?: string | null
          modality?: Database["public"]["Enums"]["lesson_modality"]
          online_provider?:
            | Database["public"]["Enums"]["online_provider"]
            | null
          room?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["lesson_status"]
          subject_id?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          ended_on: string | null
          focus: string | null
          id: string
          is_active: boolean
          mentor_id: string
          started_on: string
          student_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          ended_on?: string | null
          focus?: string | null
          id?: string
          is_active?: boolean
          mentor_id: string
          started_on?: string
          student_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          ended_on?: string | null
          focus?: string | null
          id?: string
          is_active?: boolean
          mentor_id?: string
          started_on?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_assignments_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentoring_action_items: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          session_id: string
          sort_order: number
          status: Database["public"]["Enums"]["action_item_status"]
          student_id: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          session_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["action_item_status"]
          student_id: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          session_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["action_item_status"]
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentoring_action_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentoring_action_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentoring_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentoring_action_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentoring_private_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          session_id: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          session_id?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          session_id?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentoring_private_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentoring_private_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentoring_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentoring_private_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentoring_sessions: {
        Row: {
          canceled_reason: string | null
          completed_at: string | null
          created_at: string
          decisions: string | null
          difficulties: string | null
          duration_min: number
          files: Json
          id: string
          location: string | null
          meeting_url: string | null
          mentor_id: string
          modality: Database["public"]["Enums"]["lesson_modality"]
          reminder_sent_at: string | null
          request_note: string | null
          requested_by: string | null
          scheduled_at: string | null
          shared_notes: string | null
          status: Database["public"]["Enums"]["mentoring_status"]
          student_id: string
          summary: string | null
          topics: string[]
          updated_at: string
        }
        Insert: {
          canceled_reason?: string | null
          completed_at?: string | null
          created_at?: string
          decisions?: string | null
          difficulties?: string | null
          duration_min?: number
          files?: Json
          id?: string
          location?: string | null
          meeting_url?: string | null
          mentor_id: string
          modality?: Database["public"]["Enums"]["lesson_modality"]
          reminder_sent_at?: string | null
          request_note?: string | null
          requested_by?: string | null
          scheduled_at?: string | null
          shared_notes?: string | null
          status?: Database["public"]["Enums"]["mentoring_status"]
          student_id: string
          summary?: string | null
          topics?: string[]
          updated_at?: string
        }
        Update: {
          canceled_reason?: string | null
          completed_at?: string | null
          created_at?: string
          decisions?: string | null
          difficulties?: string | null
          duration_min?: number
          files?: Json
          id?: string
          location?: string | null
          meeting_url?: string | null
          mentor_id?: string
          modality?: Database["public"]["Enums"]["lesson_modality"]
          reminder_sent_at?: string | null
          request_note?: string | null
          requested_by?: string | null
          scheduled_at?: string | null
          shared_notes?: string | null
          status?: Database["public"]["Enums"]["mentoring_status"]
          student_id?: string
          summary?: string | null
          topics?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentoring_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentoring_sessions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentoring_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          reply_to_id: string | null
          search: unknown
          sender_id: string | null
        }
        Insert: {
          attachments?: Json
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          reply_to_id?: string | null
          search?: unknown
          sender_id?: string | null
        }
        Update: {
          attachments?: Json
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          reply_to_id?: string | null
          search?: unknown
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_templates: {
        Row: {
          description: string | null
          id: string
          is_active: boolean
          sort_order: number
          stage: Database["public"]["Enums"]["venture_stage"] | null
          title: string
          track: Database["public"]["Enums"]["neoleader_track"] | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          stage?: Database["public"]["Enums"]["venture_stage"] | null
          title: string
          track?: Database["public"]["Enums"]["neoleader_track"] | null
        }
        Update: {
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          stage?: Database["public"]["Enums"]["venture_stage"] | null
          title?: string
          track?: Database["public"]["Enums"]["neoleader_track"] | null
        }
        Relationships: []
      }
      neoleader_checkpoints: {
        Row: {
          checkpoint_id: string
          completed_at: string | null
          notes: string | null
          status: Database["public"]["Enums"]["checkpoint_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          checkpoint_id: string
          completed_at?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["checkpoint_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          checkpoint_id?: string
          completed_at?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["checkpoint_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "neoleader_checkpoints_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "track_checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neoleader_checkpoints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      neoleader_profiles: {
        Row: {
          created_at: string
          goals: string | null
          headline: string | null
          track: Database["public"]["Enums"]["neoleader_track"]
          track_approved_by: string | null
          track_other_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goals?: string | null
          headline?: string | null
          track?: Database["public"]["Enums"]["neoleader_track"]
          track_approved_by?: string | null
          track_other_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goals?: string | null
          headline?: string | null
          track?: Database["public"]["Enums"]["neoleader_track"]
          track_approved_by?: string | null
          track_other_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "neoleader_profiles_track_approved_by_fkey"
            columns: ["track_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neoleader_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_criteria: {
        Row: {
          description: string | null
          id: string
          max_score: number
          name: string
          round_id: string
          sort_order: number
          weight: number
        }
        Insert: {
          description?: string | null
          id?: string
          max_score?: number
          name: string
          round_id: string
          sort_order?: number
          weight?: number
        }
        Update: {
          description?: string | null
          id?: string
          max_score?: number
          name?: string
          round_id?: string
          sort_order?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "panel_criteria_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "panel_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_evaluators: {
        Row: {
          round_id: string
          user_id: string
        }
        Insert: {
          round_id: string
          user_id: string
        }
        Update: {
          round_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "panel_evaluators_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "panel_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_evaluators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_rounds: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          panel_date: string | null
          status: Database["public"]["Enums"]["panel_round_status"]
          submissions_close_at: string | null
          submissions_open_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          panel_date?: string | null
          status?: Database["public"]["Enums"]["panel_round_status"]
          submissions_close_at?: string | null
          submissions_open_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          panel_date?: string | null
          status?: Database["public"]["Enums"]["panel_round_status"]
          submissions_close_at?: string | null
          submissions_open_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "panel_rounds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string
          key: string
          module: string
        }
        Insert: {
          description: string
          key: string
          module: string
        }
        Update: {
          description?: string
          key?: string
          module?: string
        }
        Relationships: []
      }
      pitch_decisions: {
        Row: {
          decided_at: string
          decided_by: string | null
          decision_notes: string | null
          submission_id: string
        }
        Insert: {
          decided_at?: string
          decided_by?: string | null
          decision_notes?: string | null
          submission_id: string
        }
        Update: {
          decided_at?: string
          decided_by?: string | null
          decision_notes?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pitch_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_decisions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "pitch_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pitch_evaluations: {
        Row: {
          created_at: string
          evaluator_id: string
          general_comment: string | null
          id: string
          submission_id: string
          submitted_at: string | null
        }
        Insert: {
          created_at?: string
          evaluator_id: string
          general_comment?: string | null
          id?: string
          submission_id: string
          submitted_at?: string | null
        }
        Update: {
          created_at?: string
          evaluator_id?: string
          general_comment?: string | null
          id?: string
          submission_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pitch_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_evaluations_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "pitch_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pitch_scores: {
        Row: {
          comment: string | null
          criterion_id: string
          evaluation_id: string
          score: number
        }
        Insert: {
          comment?: string | null
          criterion_id: string
          evaluation_id: string
          score: number
        }
        Update: {
          comment?: string | null
          criterion_id?: string
          evaluation_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "pitch_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "panel_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "pitch_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      pitch_submissions: {
        Row: {
          business_model: string | null
          capital_needed: number | null
          capital_use: string | null
          created_at: string
          id: string
          market: string | null
          panel_at: string | null
          pitch_deck_path: string | null
          problem: string | null
          round_id: string
          solution: string | null
          status: Database["public"]["Enums"]["pitch_status"]
          strategy: string | null
          submitted_at: string | null
          submitted_by: string
          team: string | null
          traction: string | null
          updated_at: string
          venture_id: string
        }
        Insert: {
          business_model?: string | null
          capital_needed?: number | null
          capital_use?: string | null
          created_at?: string
          id?: string
          market?: string | null
          panel_at?: string | null
          pitch_deck_path?: string | null
          problem?: string | null
          round_id: string
          solution?: string | null
          status?: Database["public"]["Enums"]["pitch_status"]
          strategy?: string | null
          submitted_at?: string | null
          submitted_by: string
          team?: string | null
          traction?: string | null
          updated_at?: string
          venture_id: string
        }
        Update: {
          business_model?: string | null
          capital_needed?: number | null
          capital_use?: string | null
          created_at?: string
          id?: string
          market?: string | null
          panel_at?: string | null
          pitch_deck_path?: string | null
          problem?: string | null
          round_id?: string
          solution?: string | null
          status?: Database["public"]["Enums"]["pitch_status"]
          strategy?: string | null
          submitted_at?: string | null
          submitted_by?: string
          team?: string | null
          traction?: string | null
          updated_at?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pitch_submissions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "panel_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_submissions_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_profiles: {
        Row: {
          areas: string[]
          bio: string | null
          company: string | null
          headline: string | null
          is_guest: boolean
          links: Json
          position: string | null
          specialties: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          areas?: string[]
          bio?: string | null
          company?: string | null
          headline?: string | null
          is_guest?: boolean
          links?: Json
          position?: string | null
          specialties?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          areas?: string[]
          bio?: string | null
          company?: string | null
          headline?: string | null
          is_guest?: boolean
          links?: Json
          position?: string | null
          specialties?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_details: {
        Row: {
          bio: string | null
          city: string | null
          competencies: string[]
          interests: string[]
          linkedin_url: string | null
          privacy: Json
          sectors: string[]
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          competencies?: string[]
          interests?: string[]
          linkedin_url?: string | null
          privacy?: Json
          sectors?: string[]
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          competencies?: string[]
          interests?: string[]
          linkedin_url?: string | null
          privacy?: Json
          sectors?: string[]
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          address: Json | null
          birth_date: string | null
          document_number: string | null
          email: string | null
          emergency_contact: Json | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: Json | null
          birth_date?: string | null
          document_number?: string | null
          email?: string | null
          emergency_contact?: Json | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: Json | null
          birth_date?: string | null
          document_number?: string | null
          email?: string | null
          emergency_contact?: Json | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          full_name: string
          id: string
          job_title: string | null
          last_seen_at: string | null
          must_change_password: boolean
          onboarded_at: string | null
          preferred_name: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string
          id: string
          job_title?: string | null
          last_seen_at?: string | null
          must_change_password?: boolean
          onboarded_at?: string | null
          preferred_name?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          job_title?: string | null
          last_seen_at?: string | null
          must_change_password?: boolean
          onboarded_at?: string | null
          preferred_name?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      progress_dimension_settings: {
        Row: {
          config: Json
          description: string | null
          dimension: Database["public"]["Enums"]["progress_dimension"]
          is_enabled: boolean
          label: string
          sort_order: number
          weight: number
        }
        Insert: {
          config?: Json
          description?: string | null
          dimension: Database["public"]["Enums"]["progress_dimension"]
          is_enabled?: boolean
          label: string
          sort_order?: number
          weight?: number
        }
        Update: {
          config?: Json
          description?: string | null
          dimension?: Database["public"]["Enums"]["progress_dimension"]
          is_enabled?: boolean
          label?: string
          sort_order?: number
          weight?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          dashboard: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
          priority: number
        }
        Insert: {
          created_at?: string
          dashboard?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
          priority?: number
        }
        Update: {
          created_at?: string
          dashboard?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          priority?: number
        }
        Relationships: []
      }
      service_request_comments: {
        Row: {
          attachments: Json
          author_id: string
          body: string
          created_at: string
          id: string
          is_internal: boolean
          request_id: string
        }
        Insert: {
          attachments?: Json
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          request_id: string
        }
        Update: {
          attachments?: Json
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          requester_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          subject: string
          type: Database["public"]["Enums"]["request_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          requester_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          subject: string
          type: Database["public"]["Enums"]["request_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          requester_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          subject?: string
          type?: Database["public"]["Enums"]["request_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_cohorts: {
        Row: {
          cohort_id: string
          subject_id: string
        }
        Insert: {
          cohort_id: string
          subject_id: string
        }
        Update: {
          cohort_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_cohorts_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_cohorts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_competencies: {
        Row: {
          competency_id: string
          subject_id: string
        }
        Insert: {
          competency_id: string
          subject_id: string
        }
        Update: {
          competency_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_competencies_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_teachers: {
        Row: {
          role: Database["public"]["Enums"]["subject_teacher_role"]
          subject_id: string
          user_id: string
        }
        Insert: {
          role?: Database["public"]["Enums"]["subject_teacher_role"]
          subject_id: string
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["subject_teacher_role"]
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_teachers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          dimensions: Database["public"]["Enums"]["progress_dimension"][]
          ends_on: string | null
          id: string
          name: string
          period_label: string | null
          sort_order: number
          starts_on: string | null
          status: Database["public"]["Enums"]["subject_status"]
          updated_at: string
          workload_hours: number | null
        }
        Insert: {
          code: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dimensions?: Database["public"]["Enums"]["progress_dimension"][]
          ends_on?: string | null
          id?: string
          name: string
          period_label?: string | null
          sort_order?: number
          starts_on?: string | null
          status?: Database["public"]["Enums"]["subject_status"]
          updated_at?: string
          workload_hours?: number | null
        }
        Update: {
          code?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dimensions?: Database["public"]["Enums"]["progress_dimension"][]
          ends_on?: string | null
          id?: string
          name?: string
          period_label?: string | null
          sort_order?: number
          starts_on?: string | null
          status?: Database["public"]["Enums"]["subject_status"]
          updated_at?: string
          workload_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      track_checkpoints: {
        Row: {
          description: string | null
          id: string
          is_active: boolean
          key: string
          sort_order: number
          title: string
          track: Database["public"]["Enums"]["neoleader_track"]
        }
        Insert: {
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          sort_order?: number
          title: string
          track: Database["public"]["Enums"]["neoleader_track"]
        }
        Update: {
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          sort_order?: number
          title?: string
          track?: Database["public"]["Enums"]["neoleader_track"]
        }
        Relationships: []
      }
      tuition_installments: {
        Row: {
          agreement_id: string
          amount: number
          due_date: string
          id: string
          number: number
          paid_at: string | null
          payment_method: string | null
          reference: string | null
          status: Database["public"]["Enums"]["installment_status"]
        }
        Insert: {
          agreement_id: string
          amount: number
          due_date: string
          id?: string
          number: number
          paid_at?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
        }
        Update: {
          agreement_id?: string
          amount?: number
          due_date?: string
          id?: string
          number?: number
          paid_at?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tuition_installments_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "financial_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          effect: Database["public"]["Enums"]["permission_effect"]
          granted_at: string
          granted_by: string | null
          permission_key: string
          user_id: string
        }
        Insert: {
          effect?: Database["public"]["Enums"]["permission_effect"]
          granted_at?: string
          granted_by?: string | null
          permission_key: string
          user_id: string
        }
        Update: {
          effect?: Database["public"]["Enums"]["permission_effect"]
          granted_at?: string
          granted_by?: string | null
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_actions: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          key_result_id: string | null
          objective_id: string | null
          owner_id: string | null
          owner_name: string | null
          sort_order: number
          status: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at: string
          venture_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          key_result_id?: string | null
          objective_id?: string | null
          owner_id?: string | null
          owner_name?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at?: string
          venture_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          key_result_id?: string | null
          objective_id?: string | null
          owner_id?: string | null
          owner_name?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
          updated_at?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_actions_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "venture_key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_actions_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "venture_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_actions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_actions_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_comments: {
        Row: {
          action_id: string | null
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          id: string
          objective_id: string | null
          venture_id: string
        }
        Insert: {
          action_id?: string | null
          author_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          objective_id?: string | null
          venture_id: string
        }
        Update: {
          action_id?: string | null
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          objective_id?: string | null
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_comments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "venture_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_comments_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "venture_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_comments_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_key_results: {
        Row: {
          current_value: number
          id: string
          objective_id: string
          sort_order: number
          start_value: number
          target_value: number
          title: string
          unit: string | null
        }
        Insert: {
          current_value?: number
          id?: string
          objective_id: string
          sort_order?: number
          start_value?: number
          target_value: number
          title: string
          unit?: string | null
        }
        Update: {
          current_value?: number
          id?: string
          objective_id?: string
          sort_order?: number
          start_value?: number
          target_value?: number
          title?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venture_key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "venture_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_kpi_values: {
        Row: {
          created_at: string
          id: string
          note: string | null
          period_start: string
          recorded_by: string | null
          value: number
          venture_kpi_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          period_start: string
          recorded_by?: string | null
          value: number
          venture_kpi_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          period_start?: string
          recorded_by?: string | null
          value?: number
          venture_kpi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_kpi_values_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_kpi_values_venture_kpi_id_fkey"
            columns: ["venture_kpi_id"]
            isOneToOne: false
            referencedRelation: "venture_kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_kpis: {
        Row: {
          custom_name: string | null
          definition_id: string | null
          id: string
          is_active: boolean
          sort_order: number
          target_value: number | null
          unit: Database["public"]["Enums"]["kpi_unit"]
          venture_id: string
        }
        Insert: {
          custom_name?: string | null
          definition_id?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          target_value?: number | null
          unit?: Database["public"]["Enums"]["kpi_unit"]
          venture_id: string
        }
        Update: {
          custom_name?: string | null
          definition_id?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          target_value?: number | null
          unit?: Database["public"]["Enums"]["kpi_unit"]
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_kpis_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_kpis_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_members: {
        Row: {
          role: string | null
          user_id: string
          venture_id: string
        }
        Insert: {
          role?: string | null
          user_id: string
          venture_id: string
        }
        Update: {
          role?: string | null
          user_id?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_members_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_milestones: {
        Row: {
          achieved_at: string | null
          created_at: string
          description: string | null
          evidence_url: string | null
          id: string
          sort_order: number
          status: Database["public"]["Enums"]["milestone_status"]
          target_date: string | null
          template_id: string | null
          title: string
          venture_id: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          description?: string | null
          evidence_url?: string | null
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          template_id?: string | null
          title: string
          venture_id: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          description?: string | null
          evidence_url?: string | null
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          template_id?: string | null
          title?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_milestones_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "milestone_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_milestones_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_objectives: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          period_label: string | null
          sort_order: number
          status: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at: string
          venture_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          period_label?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at?: string
          venture_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          period_label?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
          updated_at?: string
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_objectives_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_stage: Database["public"]["Enums"]["venture_stage"] | null
          id: string
          to_stage: Database["public"]["Enums"]["venture_stage"]
          venture_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_stage?: Database["public"]["Enums"]["venture_stage"] | null
          id?: string
          to_stage: Database["public"]["Enums"]["venture_stage"]
          venture_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_stage?: Database["public"]["Enums"]["venture_stage"] | null
          id?: string
          to_stage?: Database["public"]["Enums"]["venture_stage"]
          venture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_stage_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venture_stage_history_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      ventures: {
        Row: {
          audience: string | null
          business_model: string | null
          created_at: string
          description: string | null
          id: string
          is_primary: boolean
          last_update_at: string
          logo_url: string | null
          name: string
          owner_id: string
          pitch_deck_path: string | null
          pitch_url: string | null
          problem: string | null
          revenue_model: string | null
          segment: string | null
          solution: string | null
          stage: Database["public"]["Enums"]["venture_stage"]
          tagline: string | null
          team_description: string | null
          updated_at: string
          value_proposition: string | null
          visibility: Database["public"]["Enums"]["venture_visibility"]
          website_url: string | null
        }
        Insert: {
          audience?: string | null
          business_model?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_primary?: boolean
          last_update_at?: string
          logo_url?: string | null
          name: string
          owner_id: string
          pitch_deck_path?: string | null
          pitch_url?: string | null
          problem?: string | null
          revenue_model?: string | null
          segment?: string | null
          solution?: string | null
          stage?: Database["public"]["Enums"]["venture_stage"]
          tagline?: string | null
          team_description?: string | null
          updated_at?: string
          value_proposition?: string | null
          visibility?: Database["public"]["Enums"]["venture_visibility"]
          website_url?: string | null
        }
        Update: {
          audience?: string | null
          business_model?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_primary?: boolean
          last_update_at?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          pitch_deck_path?: string | null
          pitch_url?: string | null
          problem?: string | null
          revenue_model?: string | null
          segment?: string | null
          solution?: string | null
          stage?: Database["public"]["Enums"]["venture_stage"]
          tagline?: string | null
          team_description?: string | null
          updated_at?: string
          value_proposition?: string | null
          visibility?: Database["public"]["Enums"]["venture_visibility"]
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ventures_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_session_files: {
        Args: { p_files: Json; p_session: string }
        Returns: undefined
      }
      announcement_recipients: {
        Args: { p_announcement: string }
        Returns: {
          acknowledged_at: string
          avatar_url: string
          full_name: string
          read_at: string
          user_id: string
        }[]
      }
      announcement_stats: {
        Args: { p_announcement: string }
        Returns: {
          acknowledged: number
          pending: number
          read: number
          sent: number
        }[]
      }
      audience_match: {
        Args: {
          p_role_key: string
          p_target: string
          p_type: Database["public"]["Enums"]["audience_type"]
          p_user?: string
        }
        Returns: boolean
      }
      can_access_session_files: {
        Args: { p_session: string; p_user?: string }
        Returns: boolean
      }
      can_edit_calendar_event: {
        Args: { p_event: string; p_user?: string }
        Returns: boolean
      }
      can_edit_venture: {
        Args: { p_user?: string; p_venture: string }
        Returns: boolean
      }
      can_manage_announcement: {
        Args: { p_announcement: string; p_user?: string }
        Returns: boolean
      }
      can_read_object: {
        Args: { p_bucket: string; p_name: string }
        Returns: boolean
      }
      can_see_calendar_event: {
        Args: { p_event: string; p_user?: string }
        Returns: boolean
      }
      can_see_experience: {
        Args: { p_experience: string; p_user?: string }
        Returns: boolean
      }
      can_teach_subject: {
        Args: { p_subject: string; p_user?: string }
        Returns: boolean
      }
      can_view_cohort_insights: {
        Args: { p_cohort: string; p_user?: string }
        Returns: boolean
      }
      can_view_document: {
        Args: { p_document: string; p_user?: string }
        Returns: boolean
      }
      can_view_student: {
        Args: { p_student: string; p_user?: string }
        Returns: boolean
      }
      can_view_subject_content: {
        Args: { p_subject: string; p_user?: string }
        Returns: boolean
      }
      can_view_venture: {
        Args: { p_user?: string; p_venture: string }
        Returns: boolean
      }
      can_write_cover: { Args: { p_name: string }; Returns: boolean }
      can_write_object: {
        Args: { p_bucket: string; p_name: string }
        Returns: boolean
      }
      cancel_experience_registration: {
        Args: { p_experience: string }
        Returns: undefined
      }
      cancel_mentoring_session: {
        Args: { p_reason?: string; p_session: string }
        Returns: {
          canceled_reason: string | null
          completed_at: string | null
          created_at: string
          decisions: string | null
          difficulties: string | null
          duration_min: number
          files: Json
          id: string
          location: string | null
          meeting_url: string | null
          mentor_id: string
          modality: Database["public"]["Enums"]["lesson_modality"]
          reminder_sent_at: string | null
          request_note: string | null
          requested_by: string | null
          scheduled_at: string | null
          shared_notes: string | null
          status: Database["public"]["Enums"]["mentoring_status"]
          student_id: string
          summary: string | null
          topics: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "mentoring_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cohort_students: {
        Args: { p_cohort: string }
        Returns: {
          attendance_rate: number
          avatar_url: string
          enrollment_status: Database["public"]["Enums"]["enrollment_status"]
          full_name: string
          last_activity_at: string
          last_mentoring_at: string
          lessons_attended: number
          lessons_past: number
          mentor_name: string
          overdue_assignments: number
          risk_flags: string[]
          track: Database["public"]["Enums"]["neoleader_track"]
          user_id: string
          venture_id: string
          venture_name: string
          venture_stage: Database["public"]["Enums"]["venture_stage"]
          venture_updated_at: string
        }[]
      }
      community_directory: {
        Args: {
          p_cohort?: string
          p_kind?: string
          p_search?: string
          p_stage?: Database["public"]["Enums"]["venture_stage"]
        }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          cohort_name: string
          company: string
          competencies: string[]
          full_name: string
          interests: string[]
          job_title: string
          kind: string
          linkedin_url: string
          sectors: string[]
          specialties: string[]
          user_id: string
          venture_name: string
          venture_segment: string
          venture_stage: Database["public"]["Enums"]["venture_stage"]
        }[]
      }
      complete_first_access: { Args: never; Returns: undefined }
      complete_mentoring_session: {
        Args: {
          p_decisions?: string
          p_difficulties?: string
          p_due_in_days?: number
          p_next_steps?: string[]
          p_private_note?: string
          p_session: string
          p_summary: string
        }
        Returns: {
          canceled_reason: string | null
          completed_at: string | null
          created_at: string
          decisions: string | null
          difficulties: string | null
          duration_min: number
          files: Json
          id: string
          location: string | null
          meeting_url: string | null
          mentor_id: string
          modality: Database["public"]["Enums"]["lesson_modality"]
          reminder_sent_at: string | null
          request_note: string | null
          requested_by: string | null
          scheduled_at: string | null
          shared_notes: string | null
          status: Database["public"]["Enums"]["mentoring_status"]
          student_id: string
          summary: string | null
          topics: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "mentoring_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      convert_candidate_to_neoleader: {
        Args: { p_candidate: string; p_cohort?: string; p_user: string }
        Returns: undefined
      }
      create_group_conversation: {
        Args: {
          p_cohort?: string
          p_members: string[]
          p_title: string
          p_type: Database["public"]["Enums"]["conversation_type"]
        }
        Returns: string
      }
      current_user_context: { Args: never; Returns: Json }
      document_recipients: {
        Args: { p_document: string }
        Returns: {
          full_name: string
          read_at: string
          signed_at: string
          user_id: string
        }[]
      }
      experience_self_check_in: {
        Args: { p_experience: string }
        Returns: {
          checked_in_at: string | null
          experience_id: string
          registered_at: string
          status: Database["public"]["Enums"]["registration_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "experience_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_or_create_direct_conversation: {
        Args: { p_other: string }
        Returns: string
      }
      has_permission: {
        Args: { p_permission: string; p_user?: string }
        Returns: boolean
      }
      has_role: {
        Args: { p_role_key: string; p_user?: string }
        Returns: boolean
      }
      is_active_user: { Args: { p_user?: string }; Returns: boolean }
      is_announcement_recipient: {
        Args: { p_announcement: string; p_user?: string }
        Returns: boolean
      }
      is_cohort_member: {
        Args: { p_cohort: string; p_user?: string }
        Returns: boolean
      }
      is_conversation_admin: {
        Args: { p_conversation: string; p_user?: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { p_conversation: string; p_user?: string }
        Returns: boolean
      }
      is_panel_evaluator: {
        Args: { p_round: string; p_user?: string }
        Returns: boolean
      }
      is_subject_teacher: {
        Args: { p_subject: string; p_user?: string }
        Returns: boolean
      }
      is_super_admin: { Args: { p_user?: string }; Returns: boolean }
      is_venture_member: {
        Args: { p_user?: string; p_venture: string }
        Returns: boolean
      }
      journey_requirement_met: {
        Args: { p_req: Json; p_student: string }
        Returns: boolean
      }
      log_activity: {
        Args: {
          p_dimension: Database["public"]["Enums"]["progress_dimension"]
          p_metadata?: Json
          p_ref_id: string
          p_ref_table: string
          p_title: string
          p_type: string
          p_user: string
        }
        Returns: undefined
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_conversation_read: {
        Args: { p_conversation: string }
        Returns: undefined
      }
      mentor_mentees: {
        Args: { p_mentor?: string }
        Returns: {
          avatar_url: string
          cohort_name: string
          flags: string[]
          focus: string
          full_name: string
          last_session_at: string
          next_session_at: string
          next_session_id: string
          open_goals: number
          open_steps: number
          overdue_steps: number
          pending_requests: number
          student_id: string
          track: Database["public"]["Enums"]["neoleader_track"]
          venture_id: string
          venture_name: string
          venture_stage: Database["public"]["Enums"]["venture_stage"]
          venture_updated_at: string
        }[]
      }
      mentors_student: {
        Args: { p_student: string; p_user?: string }
        Returns: boolean
      }
      my_agenda: {
        Args: { p_from: string; p_to: string }
        Returns: {
          ends_at: string
          item_type: Database["public"]["Enums"]["agenda_type"]
          location: string
          source: string
          source_id: string
          starts_at: string
          status: string
          subtitle: string
          title: string
          url: string
        }[]
      }
      my_cohort_ids: { Args: { p_user?: string }; Returns: string[] }
      my_conversations: {
        Args: never
        Returns: {
          avatar_url: string
          id: string
          is_muted: boolean
          last_message: string
          last_message_at: string
          last_sender_name: string
          member_count: number
          other_user_id: string
          title: string
          type: Database["public"]["Enums"]["conversation_type"]
          unread: number
        }[]
      }
      my_permissions: { Args: never; Returns: string[] }
      neo_progress: {
        Args: { p_student?: string }
        Returns: {
          details: Json
          dimension: Database["public"]["Enums"]["progress_dimension"]
          label: string
          score: number
          weight: number
        }[]
      }
      notify: {
        Args: {
          p_body?: string
          p_data?: Json
          p_link?: string
          p_title: string
          p_type: string
          p_user: string
        }
        Returns: undefined
      }
      pitch_results: {
        Args: { p_round: string }
        Returns: {
          evaluations: number
          submission_id: string
          venture_id: string
          venture_name: string
          weighted_score: number
        }[]
      }
      register_for_experience: {
        Args: { p_experience: string }
        Returns: {
          checked_in_at: string | null
          experience_id: string
          registered_at: string
          status: Database["public"]["Enums"]["registration_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "experience_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_mentoring: {
        Args: {
          p_mentor: string
          p_note?: string
          p_preferred_at?: string
          p_topics?: string[]
        }
        Returns: {
          canceled_reason: string | null
          completed_at: string | null
          created_at: string
          decisions: string | null
          difficulties: string | null
          duration_min: number
          files: Json
          id: string
          location: string | null
          meeting_url: string | null
          mentor_id: string
          modality: Database["public"]["Enums"]["lesson_modality"]
          reminder_sent_at: string | null
          request_note: string | null
          requested_by: string | null
          scheduled_at: string | null
          shared_notes: string | null
          status: Database["public"]["Enums"]["mentoring_status"]
          student_id: string
          summary: string | null
          topics: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "mentoring_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      run_notification_jobs: { Args: never; Returns: undefined }
      self_check_in: {
        Args: { p_code?: string; p_lesson: string }
        Returns: {
          checked_in_at: string | null
          lesson_id: string
          method: Database["public"]["Enums"]["attendance_method"]
          note: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      student_achievements: {
        Args: { p_student?: string }
        Returns: {
          category: string
          current_value: number
          description: string
          icon: string
          key: string
          target_value: number
          title: string
          unlocked: boolean
          unlocked_at: string
        }[]
      }
      student_journey: {
        Args: { p_student?: string }
        Returns: {
          completed_at: string
          description: string
          ends_on: string
          item_id: string
          kind: Database["public"]["Enums"]["journey_item_kind"]
          requirements: Json
          source: string
          starts_on: string
          status: string
          title: string
        }[]
      }
      studies_subject: {
        Args: { p_subject: string; p_user?: string }
        Returns: boolean
      }
      subject_results: {
        Args: { p_subject: string }
        Returns: {
          assignments_due: number
          attendance_rate: number
          avatar_url: string
          average_score: number
          cohort_name: string
          full_name: string
          lessons_attended: number
          lessons_past: number
          submitted: number
          user_id: string
        }[]
      }
      teaches_student: {
        Args: { p_student: string; p_user?: string }
        Returns: boolean
      }
      touch_last_seen: { Args: never; Returns: undefined }
      try_uuid: { Args: { p: string }; Returns: string }
    }
    Enums: {
      action_item_status: "open" | "done" | "canceled"
      action_status: "not_started" | "in_progress" | "blocked" | "done"
      adjustment_kind: "scholarship" | "discount"
      admission_status:
        | "new_lead"
        | "application_received"
        | "screening"
        | "interview"
        | "committee"
        | "approved"
        | "waitlist"
        | "rejected"
        | "enrolled"
      agenda_type:
        | "class"
        | "mentoring"
        | "event"
        | "visit"
        | "deadline"
        | "panel"
        | "meeting"
      agreement_status: "active" | "completed" | "canceled" | "defaulted"
      announcement_status: "draft" | "published" | "archived"
      announcement_type:
        | "academic"
        | "urgent"
        | "event"
        | "mentoring"
        | "institutional"
        | "administrative"
      assignment_status: "draft" | "published" | "closed"
      attendance_method: "manual" | "self_checkin" | "qr_code"
      attendance_status: "present" | "late" | "absent" | "excused"
      audience_type: "all" | "cohort" | "subject" | "role" | "user"
      checkpoint_status: "not_started" | "in_progress" | "done"
      cohort_status: "planned" | "active" | "completed" | "archived"
      committee_decision: "approve" | "waitlist" | "reject"
      connection_status: "pending" | "accepted" | "declined"
      conversation_role: "owner" | "admin" | "member"
      conversation_type: "direct" | "group" | "cohort" | "team"
      document_category:
        | "academic"
        | "administrative"
        | "contract"
        | "term"
        | "certificate"
        | "material"
        | "project"
        | "financial"
        | "other"
      document_status:
        | "available"
        | "required_reading"
        | "signature_pending"
        | "expired"
      enrollment_status:
        | "active"
        | "paused"
        | "completed"
        | "dropped"
        | "transferred"
      experience_category:
        | "neomeeting"
        | "conexao_neo"
        | "company_visit"
        | "workshop"
        | "mission"
        | "event"
        | "meetup"
        | "international"
        | "other"
      experience_status: "draft" | "published" | "canceled" | "completed"
      goal_source: "self" | "mentoring" | "coordination" | "venture"
      goal_status:
        | "not_started"
        | "in_progress"
        | "blocked"
        | "done"
        | "canceled"
      installment_status: "pending" | "paid" | "overdue" | "canceled" | "waived"
      interview_recommendation: "advance" | "hold" | "reject"
      journey_item_kind:
        | "subject"
        | "mentoring"
        | "project"
        | "event"
        | "company_visit"
        | "milestone"
        | "panel"
        | "experience"
        | "certification"
      kpi_unit: "count" | "currency" | "percent" | "number"
      lesson_modality: "in_person" | "online" | "hybrid"
      lesson_status:
        | "scheduled"
        | "live"
        | "completed"
        | "canceled"
        | "rescheduled"
      lesson_type:
        | "class"
        | "workshop"
        | "masterclass"
        | "case"
        | "lab"
        | "dynamic"
        | "practical"
      material_kind: "file" | "link" | "video" | "slides"
      mentoring_status:
        | "requested"
        | "scheduled"
        | "completed"
        | "canceled"
        | "no_show"
      milestone_status: "pending" | "achieved"
      neoleader_track: "founder" | "successor" | "other"
      online_provider: "meet" | "zoom" | "teams" | "other"
      panel_round_status: "draft" | "open" | "reviewing" | "closed"
      permission_effect: "grant" | "revoke"
      pitch_status:
        | "draft"
        | "eligible"
        | "submitted"
        | "in_review"
        | "panel_scheduled"
        | "evaluated"
        | "selected"
        | "not_selected"
      progress_dimension:
        | "learning"
        | "execution"
        | "mentoring"
        | "participation"
        | "venture"
        | "experiences"
        | "goals"
      registration_status:
        | "confirmed"
        | "waitlist"
        | "canceled"
        | "attended"
        | "no_show"
      request_status:
        | "open"
        | "in_review"
        | "awaiting_user"
        | "resolved"
        | "canceled"
      request_type:
        | "document"
        | "declaration"
        | "profile_change"
        | "support"
        | "academic_issue"
        | "other"
      subject_status: "draft" | "active" | "completed" | "archived"
      subject_teacher_role: "lead" | "guest" | "assistant"
      submission_status:
        | "draft"
        | "submitted"
        | "late"
        | "reviewed"
        | "returned"
      user_status: "invited" | "active" | "inactive" | "suspended" | "alumni"
      venture_stage:
        | "ideation"
        | "validation"
        | "mvp"
        | "operation"
        | "traction"
        | "scale"
      venture_visibility: "private" | "community"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_item_status: ["open", "done", "canceled"],
      action_status: ["not_started", "in_progress", "blocked", "done"],
      adjustment_kind: ["scholarship", "discount"],
      admission_status: [
        "new_lead",
        "application_received",
        "screening",
        "interview",
        "committee",
        "approved",
        "waitlist",
        "rejected",
        "enrolled",
      ],
      agenda_type: [
        "class",
        "mentoring",
        "event",
        "visit",
        "deadline",
        "panel",
        "meeting",
      ],
      agreement_status: ["active", "completed", "canceled", "defaulted"],
      announcement_status: ["draft", "published", "archived"],
      announcement_type: [
        "academic",
        "urgent",
        "event",
        "mentoring",
        "institutional",
        "administrative",
      ],
      assignment_status: ["draft", "published", "closed"],
      attendance_method: ["manual", "self_checkin", "qr_code"],
      attendance_status: ["present", "late", "absent", "excused"],
      audience_type: ["all", "cohort", "subject", "role", "user"],
      checkpoint_status: ["not_started", "in_progress", "done"],
      cohort_status: ["planned", "active", "completed", "archived"],
      committee_decision: ["approve", "waitlist", "reject"],
      connection_status: ["pending", "accepted", "declined"],
      conversation_role: ["owner", "admin", "member"],
      conversation_type: ["direct", "group", "cohort", "team"],
      document_category: [
        "academic",
        "administrative",
        "contract",
        "term",
        "certificate",
        "material",
        "project",
        "financial",
        "other",
      ],
      document_status: [
        "available",
        "required_reading",
        "signature_pending",
        "expired",
      ],
      enrollment_status: [
        "active",
        "paused",
        "completed",
        "dropped",
        "transferred",
      ],
      experience_category: [
        "neomeeting",
        "conexao_neo",
        "company_visit",
        "workshop",
        "mission",
        "event",
        "meetup",
        "international",
        "other",
      ],
      experience_status: ["draft", "published", "canceled", "completed"],
      goal_source: ["self", "mentoring", "coordination", "venture"],
      goal_status: [
        "not_started",
        "in_progress",
        "blocked",
        "done",
        "canceled",
      ],
      installment_status: ["pending", "paid", "overdue", "canceled", "waived"],
      interview_recommendation: ["advance", "hold", "reject"],
      journey_item_kind: [
        "subject",
        "mentoring",
        "project",
        "event",
        "company_visit",
        "milestone",
        "panel",
        "experience",
        "certification",
      ],
      kpi_unit: ["count", "currency", "percent", "number"],
      lesson_modality: ["in_person", "online", "hybrid"],
      lesson_status: [
        "scheduled",
        "live",
        "completed",
        "canceled",
        "rescheduled",
      ],
      lesson_type: [
        "class",
        "workshop",
        "masterclass",
        "case",
        "lab",
        "dynamic",
        "practical",
      ],
      material_kind: ["file", "link", "video", "slides"],
      mentoring_status: [
        "requested",
        "scheduled",
        "completed",
        "canceled",
        "no_show",
      ],
      milestone_status: ["pending", "achieved"],
      neoleader_track: ["founder", "successor", "other"],
      online_provider: ["meet", "zoom", "teams", "other"],
      panel_round_status: ["draft", "open", "reviewing", "closed"],
      permission_effect: ["grant", "revoke"],
      pitch_status: [
        "draft",
        "eligible",
        "submitted",
        "in_review",
        "panel_scheduled",
        "evaluated",
        "selected",
        "not_selected",
      ],
      progress_dimension: [
        "learning",
        "execution",
        "mentoring",
        "participation",
        "venture",
        "experiences",
        "goals",
      ],
      registration_status: [
        "confirmed",
        "waitlist",
        "canceled",
        "attended",
        "no_show",
      ],
      request_status: [
        "open",
        "in_review",
        "awaiting_user",
        "resolved",
        "canceled",
      ],
      request_type: [
        "document",
        "declaration",
        "profile_change",
        "support",
        "academic_issue",
        "other",
      ],
      subject_status: ["draft", "active", "completed", "archived"],
      subject_teacher_role: ["lead", "guest", "assistant"],
      submission_status: ["draft", "submitted", "late", "reviewed", "returned"],
      user_status: ["invited", "active", "inactive", "suspended", "alumni"],
      venture_stage: [
        "ideation",
        "validation",
        "mvp",
        "operation",
        "traction",
        "scale",
      ],
      venture_visibility: ["private", "community"],
    },
  },
} as const
